import { MongoServerError, ObjectId, type Filter } from "mongodb";

import { getMeetingsCollection } from "../meetings/meeting.repository.js";
import type { Meeting } from "../meetings/meeting.types.js";
import { getMeetingReminderDeliveriesCollection } from "./meeting-reminder.index.js";
import type {
  MeetingReminderChannel,
  MeetingReminderDelivery,
  MeetingReminderDeliveryKey,
  MeetingReminderDeliveryStatus,
  MeetingReminderFailureReason,
} from "./meeting-reminder.types.js";

function deliveryKeyFilter(
  key: MeetingReminderDeliveryKey,
): Filter<MeetingReminderDelivery> {
  const base = {
    meetingId: key.meetingId,
    intervalMinutes: key.intervalMinutes,
    recipientKind: key.recipientKind,
    recipientId: key.recipientId,
    scheduledFor: key.scheduledFor,
  };

  return key.channel === "EMAIL"
    ? {
        ...base,
        $or: [{ channel: "EMAIL" }, { channel: { $exists: false } }],
      }
    : { ...base, channel: "WHATSAPP" };
}

function channelCondition(
  channel: MeetingReminderChannel,
): Filter<MeetingReminderDelivery> {
  return channel === "EMAIL"
    ? { $or: [{ channel: "EMAIL" }, { channel: { $exists: false } }] }
    : { channel: "WHATSAPP" };
}

function withChannel(
  filter: Filter<MeetingReminderDelivery>,
  channel: MeetingReminderChannel,
): Filter<MeetingReminderDelivery> {
  return { $and: [filter, channelCondition(channel)] };
}

function isDuplicateKeyError(error: unknown): boolean {
  return error instanceof MongoServerError && error.code === 11000;
}

export async function insertReminderDeliveryIfAbsent(
  key: MeetingReminderDeliveryKey,
  status: Extract<MeetingReminderDeliveryStatus, "pending" | "missed">,
  now: Date,
): Promise<{ delivery: MeetingReminderDelivery; created: boolean }> {
  const collection = getMeetingReminderDeliveriesCollection();
  const filter = deliveryKeyFilter(key);

  try {
    const result = await collection.updateOne(
      filter,
      {
        $setOnInsert: {
          ...key,
          status,
          attempts: 0,
          nextAttemptAt: null,
          leaseOwner: null,
          leaseExpiresAt: null,
          lastAttemptAt: null,
          sentAt: null,
          provider: null,
          providerMessageId: null,
          lastFailureReason: null,
          createdAt: now,
          updatedAt: now,
        },
      },
      { upsert: true },
    );

    const created = result.upsertedCount === 1;
    const delivery = await collection.findOne(
      created && result.upsertedId
        ? { _id: result.upsertedId }
        : deliveryKeyFilter(key),
    );
    if (!delivery) {
      throw new Error("Reminder delivery upsert returned no document");
    }
    return { delivery, created };
  } catch (error) {
    if (!isDuplicateKeyError(error)) throw error;
    const existing = await collection.findOne(deliveryKeyFilter(key));
    if (!existing) throw error;
    return { delivery: existing, created: false };
  }
}

export async function reviveCancelledReminderDelivery(
  key: MeetingReminderDeliveryKey,
  now: Date,
): Promise<boolean> {
  const result = await getMeetingReminderDeliveriesCollection().updateOne(
    {
      ...deliveryKeyFilter(key),
      meetingStartAt: key.meetingStartAt,
      status: "cancelled",
    },
    {
      $set: {
        status: "pending",
        attempts: 0,
        nextAttemptAt: null,
        leaseOwner: null,
        leaseExpiresAt: null,
        lastAttemptAt: null,
        lastFailureReason: null,
        updatedAt: now,
      },
    },
  );

  return result.modifiedCount === 1;
}

export async function findDueReminderDeliveries(
  now: Date,
  limit: number,
  channel: MeetingReminderChannel,
): Promise<MeetingReminderDelivery[]> {
  return getMeetingReminderDeliveriesCollection()
    .find(
      withChannel(
        {
          status: "pending",
          scheduledFor: { $lte: now },
          $and: [
            {
              $or: [{ nextAttemptAt: null }, { nextAttemptAt: { $lte: now } }],
            },
            {
              $or: [
                { leaseExpiresAt: null },
                { leaseExpiresAt: { $lte: now } },
              ],
            },
          ],
        },
        channel,
      ),
    )
    .sort({ scheduledFor: 1 })
    .limit(limit)
    .toArray();
}

export async function claimReminderDelivery(options: {
  id: MeetingReminderDelivery["_id"];
  leaseOwner: string;
  now: Date;
  leaseMs: number;
  maxAttempts: number;
}): Promise<MeetingReminderDelivery | null> {
  if (!options.id) return null;

  return getMeetingReminderDeliveriesCollection().findOneAndUpdate(
    {
      _id: options.id,
      status: "pending",
      attempts: { $lt: options.maxAttempts },
      $and: [
        {
          $or: [
            { nextAttemptAt: null },
            { nextAttemptAt: { $lte: options.now } },
          ],
        },
        {
          $or: [
            { leaseExpiresAt: null },
            { leaseExpiresAt: { $lte: options.now } },
          ],
        },
      ],
    },
    {
      $set: {
        status: "sending",
        leaseOwner: options.leaseOwner,
        leaseExpiresAt: new Date(options.now.getTime() + options.leaseMs),
        lastAttemptAt: options.now,
        updatedAt: options.now,
      },
      $inc: { attempts: 1 },
    },
    { returnDocument: "after" },
  );
}

export async function markReminderSent(options: {
  id: MeetingReminderDelivery["_id"];
  leaseOwner: string;
  now: Date;
  provider: string;
  providerMessageId?: string;
}): Promise<boolean> {
  if (!options.id) return false;

  const result = await getMeetingReminderDeliveriesCollection().updateOne(
    {
      _id: options.id,
      status: "sending",
      leaseOwner: options.leaseOwner,
    },
    {
      $set: {
        status: "sent",
        sentAt: options.now,
        provider: options.provider,
        providerMessageId: options.providerMessageId ?? null,
        lastFailureReason: null,
        nextAttemptAt: null,
        leaseOwner: null,
        leaseExpiresAt: null,
        updatedAt: options.now,
      },
    },
  );

  return result.modifiedCount === 1;
}

export async function markReminderRetry(options: {
  id: MeetingReminderDelivery["_id"];
  leaseOwner: string;
  now: Date;
  nextAttemptAt: Date;
  reason: MeetingReminderFailureReason;
}): Promise<boolean> {
  if (!options.id) return false;

  const result = await getMeetingReminderDeliveriesCollection().updateOne(
    {
      _id: options.id,
      status: "sending",
      leaseOwner: options.leaseOwner,
    },
    {
      $set: {
        status: "pending",
        nextAttemptAt: options.nextAttemptAt,
        lastFailureReason: options.reason,
        leaseOwner: null,
        leaseExpiresAt: null,
        updatedAt: options.now,
      },
    },
  );

  return result.modifiedCount === 1;
}

export async function markReminderTerminal(options: {
  id: MeetingReminderDelivery["_id"];
  leaseOwner: string;
  now: Date;
  status: Extract<
    MeetingReminderDeliveryStatus,
    "failed" | "unknown" | "missed" | "cancelled"
  >;
  reason: MeetingReminderFailureReason | null;
}): Promise<boolean> {
  if (!options.id) return false;

  const result = await getMeetingReminderDeliveriesCollection().updateOne(
    {
      _id: options.id,
      status: "sending",
      leaseOwner: options.leaseOwner,
    },
    {
      $set: {
        status: options.status,
        lastFailureReason: options.reason,
        nextAttemptAt: null,
        leaseOwner: null,
        leaseExpiresAt: null,
        updatedAt: options.now,
      },
    },
  );

  return result.modifiedCount === 1;
}

export async function markPendingReminderStatus(options: {
  id: MeetingReminderDelivery["_id"];
  now: Date;
  status: Extract<MeetingReminderDeliveryStatus, "missed" | "cancelled">;
}): Promise<boolean> {
  if (!options.id) return false;

  const result = await getMeetingReminderDeliveriesCollection().updateOne(
    { _id: options.id, status: "pending" },
    {
      $set: {
        status: options.status,
        nextAttemptAt: null,
        updatedAt: options.now,
      },
    },
  );

  return result.modifiedCount === 1;
}

export async function cancelStalePendingReminders(options: {
  meetingId: Meeting["_id"];
  currentStartAt: Date;
  now: Date;
  channel: MeetingReminderChannel;
}): Promise<number> {
  if (!options.meetingId) return 0;

  const result = await getMeetingReminderDeliveriesCollection().updateMany(
    withChannel(
      {
        meetingId: options.meetingId,
        status: "pending",
        meetingStartAt: { $ne: options.currentStartAt },
      },
      options.channel,
    ),
    {
      $set: {
        status: "cancelled",
        nextAttemptAt: null,
        updatedAt: options.now,
      },
    },
  );

  return result.modifiedCount;
}

export async function cancelPendingRemindersForIntervalsNotIn(options: {
  meetingId: Meeting["_id"];
  intervals: readonly number[];
  now: Date;
  channel: MeetingReminderChannel;
}): Promise<number> {
  if (!options.meetingId) return 0;

  const result = await getMeetingReminderDeliveriesCollection().updateMany(
    withChannel(
      {
        meetingId: options.meetingId,
        status: "pending",
        intervalMinutes: { $nin: options.intervals },
      },
      options.channel,
    ),
    {
      $set: {
        status: "cancelled",
        nextAttemptAt: null,
        updatedAt: options.now,
      },
    },
  );

  return result.modifiedCount;
}

export async function cancelPendingRemindersForIneligibleRecipients(options: {
  meetingId: Meeting["_id"];
  channel: MeetingReminderChannel;
  eligibleRecipientIds: string[];
  now: Date;
}): Promise<number> {
  if (!options.meetingId) return 0;

  const result = await getMeetingReminderDeliveriesCollection().updateMany(
    withChannel(
      {
        meetingId: options.meetingId,
        status: "pending",
        recipientId: { $nin: options.eligibleRecipientIds },
      },
      options.channel,
    ),
    {
      $set: {
        status: "cancelled",
        nextAttemptAt: null,
        lastFailureReason: "recipient_ineligible",
        updatedAt: options.now,
      },
    },
  );

  return result.modifiedCount;
}

export async function cancelPendingRemindersForOtherChannels(options: {
  channel: MeetingReminderChannel;
  now: Date;
}): Promise<number> {
  const filter: Filter<MeetingReminderDelivery> =
    options.channel === "EMAIL"
      ? { status: "pending", channel: "WHATSAPP" }
      : { status: "pending", channel: { $ne: "WHATSAPP" } };

  const result = await getMeetingReminderDeliveriesCollection().updateMany(
    filter,
    {
      $set: {
        status: "cancelled",
        nextAttemptAt: null,
        updatedAt: options.now,
      },
    },
  );

  return result.modifiedCount;
}

export async function markPendingFirstAttemptsMissed(options: {
  meetingId: Meeting["_id"];
  intervalMinutes: number;
  cutoff: Date;
  now: Date;
  channel: MeetingReminderChannel;
}): Promise<number> {
  if (!options.meetingId) return 0;

  const result = await getMeetingReminderDeliveriesCollection().updateMany(
    withChannel(
      {
        meetingId: options.meetingId,
        intervalMinutes: options.intervalMinutes,
        status: "pending",
        attempts: 0,
        scheduledFor: { $lt: options.cutoff },
      },
      options.channel,
    ),
    { $set: { status: "missed", updatedAt: options.now } },
  );

  return result.modifiedCount;
}

export async function expireSendingReminderLeases(now: Date): Promise<number> {
  const result = await getMeetingReminderDeliveriesCollection().updateMany(
    { status: "sending", leaseExpiresAt: { $lte: now } },
    {
      $set: {
        status: "unknown",
        lastFailureReason: "lease_expired",
        nextAttemptAt: null,
        leaseOwner: null,
        leaseExpiresAt: null,
        updatedAt: now,
      },
    },
  );

  return result.modifiedCount;
}

export async function findPendingReminderDeliveries(options: {
  limit: number;
  afterId?: MeetingReminderDelivery["_id"];
  channel: MeetingReminderChannel;
}): Promise<MeetingReminderDelivery[]> {
  const filter = withChannel(
    {
      status: "pending",
      ...(options.afterId ? { _id: { $gt: options.afterId } } : {}),
    },
    options.channel,
  );

  return getMeetingReminderDeliveriesCollection()
    .find(filter)
    .sort({ _id: 1 })
    .limit(options.limit)
    .toArray();
}

export async function findUpcomingReminderMeetings(options: {
  now: Date;
  horizonEnd: Date;
  limit: number;
}): Promise<Meeting[]> {
  return getMeetingsCollection()
    .find({
      cancelledAt: { $exists: false },
      startAt: { $gt: options.now, $lte: options.horizonEnd },
    })
    .sort({ startAt: 1 })
    .limit(options.limit)
    .toArray();
}

export async function findMeetingsForRemindersByIds(
  ids: ObjectId[],
): Promise<Meeting[]> {
  if (ids.length === 0) return [];
  return getMeetingsCollection()
    .find({ _id: { $in: ids } })
    .toArray();
}
