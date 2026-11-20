import { ObjectId } from "mongodb";

import { findUsersByIds } from "../users/user.repository.js";
import type { UserDirectoryEntry } from "../users/user.types.js";
import type { Meeting } from "../meetings/meeting.types.js";
import type { MeetingReminderRecipient } from "./meeting-reminder.types.js";

type ReminderMeeting = Pick<
  Meeting,
  "_id" | "createdBy" | "participantIds"
>;

function isEligibleRole(
  role: UserDirectoryEntry["role"],
): role is "ADMIN" | "DOSEN" {
  return role === "ADMIN" || role === "DOSEN";
}

function displayNameFor(entry: UserDirectoryEntry): string {
  const fallback = entry.email.split("@", 1)[0] || entry.email;
  return entry.displayName?.trim() || fallback;
}

export function filterEligibleReminderRecipients(
  entries: UserDirectoryEntry[],
): MeetingReminderRecipient[] {
  const seen = new Set<string>();
  const recipients: MeetingReminderRecipient[] = [];

  for (const entry of entries) {
    if (!entry._id || !entry.isActive || !isEligibleRole(entry.role)) {
      continue;
    }

    const userId = entry._id.toString();
    if (seen.has(userId)) continue;
    seen.add(userId);

    recipients.push({
      userId,
      email: entry.email,
      displayName: displayNameFor(entry),
      role: entry.role,
    });
  }

  return recipients.sort((left, right) =>
    left.userId.localeCompare(right.userId),
  );
}

export function meetingReminderUserIds(meeting: ReminderMeeting): ObjectId[] {
  const seen = new Set<string>();
  const ids: ObjectId[] = [];

  for (const id of [meeting.createdBy, ...(meeting.participantIds ?? [])]) {
    if (!id) continue;
    const key = id.toString();
    if (seen.has(key)) continue;
    seen.add(key);
    ids.push(id);
  }

  return ids;
}

export async function resolveMeetingReminderRecipients(
  meeting: ReminderMeeting,
): Promise<MeetingReminderRecipient[]> {
  const entries = await findUsersByIds(meetingReminderUserIds(meeting));
  return filterEligibleReminderRecipients(entries);
}

export async function resolveEligibleReminderRecipient(
  meeting: ReminderMeeting,
  userId: string,
): Promise<MeetingReminderRecipient | null> {
  if (!ObjectId.isValid(userId)) return null;

  const isCreator = meeting.createdBy?.toString() === userId;
  const isParticipant = (meeting.participantIds ?? []).some(
    (id) => id.toString() === userId,
  );

  if (!isCreator && !isParticipant) return null;

  const [entry] = await findUsersByIds([new ObjectId(userId)]);
  if (!entry) return null;

  return filterEligibleReminderRecipients([entry])[0] ?? null;
}

export async function resolveMeetingOrganizerName(
  meeting: ReminderMeeting,
): Promise<string> {
  if (!meeting.createdBy) return "RAMS";

  const [entry] = await findUsersByIds([meeting.createdBy]);
  if (!entry) return "RAMS";
  return displayNameFor(entry);
}
