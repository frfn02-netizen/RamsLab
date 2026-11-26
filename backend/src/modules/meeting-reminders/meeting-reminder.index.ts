import {
  MongoServerError,
  type Collection,
  type IndexDescription,
} from "mongodb";

import { getDatabase } from "../../config/database.js";
import {
  MEETING_REMINDER_COLLECTION,
  MEETING_REMINDER_INTERVALS_MINUTES,
} from "./meeting-reminder.constants.js";
import type { MeetingReminderDelivery } from "./meeting-reminder.types.js";

export const MEETING_REMINDER_INDEX_SPECS = [
  {
    name: "meeting_reminder_delivery_unique_v2",
    key: {
      meetingId: 1,
      intervalMinutes: 1,
      recipientKind: 1,
      recipientId: 1,
      scheduledFor: 1,
      channel: 1,
    },
    unique: true,
  },
  {
    name: "meeting_reminder_due_index_v2",
    key: { channel: 1, status: 1, nextAttemptAt: 1, scheduledFor: 1 },
  },
  {
    name: "meeting_reminder_meeting_index",
    key: { meetingId: 1, status: 1 },
  },
] as const;

export const LEGACY_MEETING_REMINDER_INDEX_NAMES = [
  "meeting_reminder_delivery_unique",
  "meeting_reminder_due_index",
] as const;

export function getMeetingReminderDeliveriesCollection(): Collection<MeetingReminderDelivery> {
  return getDatabase().collection<MeetingReminderDelivery>(
    MEETING_REMINDER_COLLECTION,
  );
}

function indexKeyMatches(
  existing: Record<string, number> | undefined,
  expected: Record<string, number>,
): boolean {
  if (!existing) return false;
  const left = Object.entries(existing);
  const right = Object.entries(expected);
  return (
    left.length === right.length &&
    left.every(
      ([key, direction], index) =>
        right[index]?.[0] === key && right[index]?.[1] === direction,
    )
  );
}

export interface CreateMeetingReminderIndexOptions {
  dropLegacyIndexes?: boolean;
  requireChannelCoexistence?: boolean;
}

export async function createMeetingReminderIndexes(
  collection: Collection<MeetingReminderDelivery> = getMeetingReminderDeliveriesCollection(),
  options: CreateMeetingReminderIndexOptions = {},
): Promise<void> {
  let existing: IndexDescription[] = [];
  try {
    existing = await collection.indexes();
  } catch (error) {
    if (error instanceof MongoServerError && error.code === 26) {
      existing = [];
    } else {
      throw error;
    }
  }

  const byName = new Map(existing.map((index) => [index.name, index]));

  if (
    options.requireChannelCoexistence === true &&
    byName.has("meeting_reminder_delivery_unique") &&
    options.dropLegacyIndexes !== true
  ) {
    throw new Error(
      "WhatsApp channel coexistence requires the legacy reminder index contract step. Stop all application instances and set MEETING_REMINDER_CONTRACT_LEGACY_INDEXES=true.",
    );
  }

  if (byName.has("meeting_reminder_delivery_unique")) {
    await collection.updateMany(
      { channel: { $exists: false } },
      { $set: { channel: "EMAIL" } },
    );
  }

  for (const spec of MEETING_REMINDER_INDEX_SPECS) {
    const current = byName.get(spec.name);
    const unique = "unique" in spec ? spec.unique : false;
    if (current) {
      if (
        indexKeyMatches(
          current.key as Record<string, number>,
          spec.key as Record<string, number>,
        ) &&
        Boolean(current.unique) === Boolean(unique)
      ) {
        continue;
      }
      await collection.dropIndex(spec.name);
    }

    await collection.createIndex(spec.key, {
      name: spec.name,
      ...(unique ? { unique: true } : {}),
    });
  }

  if (options.dropLegacyIndexes === true) {
    for (const legacyName of LEGACY_MEETING_REMINDER_INDEX_NAMES) {
      if (!byName.has(legacyName)) continue;
      try {
        await collection.dropIndex(legacyName);
      } catch (error) {
        if (!(error instanceof MongoServerError && error.code === 27)) {
          throw error;
        }
      }
    }
  }

  console.log(
    `Meeting reminder indexes verified for ${MEETING_REMINDER_INTERVALS_MINUTES.length} intervals (${options.dropLegacyIndexes === true ? "contract" : "expand"})`,
  );
}
