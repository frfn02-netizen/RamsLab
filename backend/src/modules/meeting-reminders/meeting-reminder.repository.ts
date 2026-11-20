import { MongoServerError, ObjectId, type Filter } from "mongodb";

import { getMeetingsCollection } from "../meetings/meeting.repository.js";
import type { Meeting } from "../meetings/meeting.types.js";
import { getMeetingReminderDeliveriesCollection } from "./meeting-reminder.index.js";
import type {
  MeetingReminderDelivery,
  MeetingReminderDeliveryKey,
  MeetingReminderDeliveryStatus,
  MeetingReminderFailureReason,
} from "./meeting-reminder.types.js";

function deliveryKeyFilter(
  key: MeetingReminderDeliveryKey,
): Filter<MeetingReminderDelivery> {
  return {
    meetingId: key.meetingId,
    intervalMinutes: key.intervalMinutes,
    recipientKind: key.recipientKind,
    recipientId: key.recipientId,
    scheduledFor: key.scheduledFor,
  };
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

  try {
    const result = await collection.findOneAndUpdate(
      deliveryKeyFilter(key),
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
      { upsert: true, returnDocument: "after" },
    );

    if (result) return { delivery: result, created: true };
    throw new Error("Reminder delivery upsert returned no document");
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
): Promise<MeetingReminderDelivery[]> {
  return getMeetingReminderDeliveriesCollection()
    .find({
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
    })
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
        leaseExpiresAt: new Date(
          options.now.getTime() + options.leaseMs,
        ),
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
}): Promise<number> {
  if (!options.meetingId) return 0;

  const result = await getMeetingReminderDeliveriesCollection().updateMany(
    {
      meetingId: options.meetingId,
      status: "pending",
      meetingStartAt: { $ne: options.currentStartAt },
    },
    { $set: { status: "cancelled", nextAttemptAt: null, updatedAt: options.now } },
  );

  return result.modifiedCount;
}

export async function cancelPendingRemindersForIntervalsNotIn(options: {
  meetingId: Meeting["_id"];
  intervals: readonly number[];
  now: Date;
}): Promise<number> {
  if (!options.meetingId) return 0;

  const result = await getMeetingReminderDeliveriesCollection().updateMany(
    {
      meetingId: options.meetingId,
      status: "pending",
      intervalMinutes: { $nin: options.intervals },
    },
    { $set: { status: "cancelled", nextAttemptAt: null, updatedAt: options.now } },
  );

  return result.modifiedCount;
}

export async function markPendingFirstAttemptsMissed(options: {
  meetingId: Meeting["_id"];
  intervalMinutes: number;
  cutoff: Date;
  now: Date;
}): Promise<number> {
  if (!options.meetingId) return 0;

  const result = await getMeetingReminderDeliveriesCollection().updateMany(
    {
      meetingId: options.meetingId,
      intervalMinutes: options.intervalMinutes,
      status: "pending",
      attempts: 0,
      scheduledFor: { $lt: options.cutoff },
    },
    { $set: { status: "missed", updatedAt: options.now } },
  );

  return result.modifiedCount;
}

export async function expireSendingReminderLeases(
  now: Date,
): Promise<number> {
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
}): Promise<MeetingReminderDelivery[]> {
  const filter: Filter<MeetingReminderDelivery> = { status: "pending" };
  if (options.afterId) {
    filter._id = { $gt: options.afterId };
  }

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
