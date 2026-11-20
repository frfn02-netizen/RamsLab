import type { Collection } from "mongodb";

import { getDatabase } from "../../config/database.js";
import {
  MEETING_REMINDER_COLLECTION,
  MEETING_REMINDER_INTERVALS_MINUTES,
} from "./meeting-reminder.constants.js";
import type { MeetingReminderDelivery } from "./meeting-reminder.types.js";

export const MEETING_REMINDER_INDEX_SPECS = [
  {
    name: "meeting_reminder_delivery_unique",
    key: {
      meetingId: 1,
      intervalMinutes: 1,
      recipientKind: 1,
      recipientId: 1,
      scheduledFor: 1,
    },
    unique: true,
  },
  {
    name: "meeting_reminder_due_index",
    key: { status: 1, nextAttemptAt: 1, scheduledFor: 1 },
  },
  {
    name: "meeting_reminder_meeting_index",
    key: { meetingId: 1, status: 1 },
  },
] as const;

export function getMeetingReminderDeliveriesCollection(): Collection<MeetingReminderDelivery> {
  return getDatabase().collection<MeetingReminderDelivery>(
    MEETING_REMINDER_COLLECTION,
  );
}

export async function createMeetingReminderIndexes(
  collection: Collection<MeetingReminderDelivery> = getMeetingReminderDeliveriesCollection(),
): Promise<void> {
  for (const spec of MEETING_REMINDER_INDEX_SPECS) {
    await collection.createIndex(spec.key, {
      name: spec.name,
      ...("unique" in spec ? { unique: spec.unique } : {}),
    });
  }

  console.log(
    `Meeting reminder indexes verified for ${MEETING_REMINDER_INTERVALS_MINUTES.length} intervals`,
  );
}
