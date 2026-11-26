import { MongoServerError, type Collection } from "mongodb";

import { getDatabase } from "../../config/database.js";
import type { MeetingReminderChannel } from "./meeting-reminder.types.js";

export const MEETING_REMINDER_CHANNEL_LEASE_COLLECTION =
  "meeting_reminder_channel_lease";
export const MEETING_REMINDER_CHANNEL_LEASE_ID = "active";

const MIN_CHANNEL_LEASE_MS = 5 * 60_000;

export interface MeetingReminderChannelLease {
  _id: string;
  channel: MeetingReminderChannel;
  owner: string;
  expiresAt: Date;
  updatedAt: Date;
}

export interface MeetingReminderChannelLeaseResult {
  acquired: boolean;
  channel?: MeetingReminderChannel;
}

export function meetingReminderChannelLeaseMs(pollMs: number): number {
  return Math.max(MIN_CHANNEL_LEASE_MS, pollMs * 3);
}

export function getMeetingReminderChannelLeaseCollection(): Collection<MeetingReminderChannelLease> {
  return getDatabase().collection<MeetingReminderChannelLease>(
    MEETING_REMINDER_CHANNEL_LEASE_COLLECTION,
  );
}

export async function acquireMeetingReminderChannelLease(options: {
  channel: MeetingReminderChannel;
  owner: string;
  now: Date;
  leaseMs: number;
}): Promise<MeetingReminderChannelLeaseResult> {
  const collection = getMeetingReminderChannelLeaseCollection();
  const expiresAt = new Date(options.now.getTime() + options.leaseMs);

  try {
    const lease = await collection.findOneAndUpdate(
      {
        _id: MEETING_REMINDER_CHANNEL_LEASE_ID,
        $or: [
          { expiresAt: { $lte: options.now } },
          { channel: options.channel },
          { channel: { $exists: false } },
        ],
      },
      {
        $set: {
          channel: options.channel,
          owner: options.owner,
          expiresAt,
          updatedAt: options.now,
        },
      },
      { upsert: true, returnDocument: "after" },
    );

    if (lease) {
      return { acquired: true, channel: lease.channel };
    }
  } catch (error) {
    if (!(error instanceof MongoServerError && error.code === 11000)) {
      throw error;
    }
  }

  const current = await collection.findOne({
    _id: MEETING_REMINDER_CHANNEL_LEASE_ID,
  });
  if (current?.channel === options.channel) {
    return { acquired: true, channel: current.channel };
  }

  return {
    acquired: false,
    ...(current ? { channel: current.channel } : {}),
  };
}
