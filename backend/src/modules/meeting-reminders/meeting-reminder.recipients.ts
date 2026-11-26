import { ObjectId } from "mongodb";

import { normalizeE164 } from "../../lib/phone.js";
import {
  findReminderContactsByIds,
  findUsersByIds,
} from "../users/user.repository.js";
import type {
  UserDirectoryEntry,
  UserReminderContact,
} from "../users/user.types.js";
import type { Meeting } from "../meetings/meeting.types.js";
import type {
  MeetingReminderChannel,
  MeetingReminderRecipient,
} from "./meeting-reminder.types.js";

type ReminderMeeting = Pick<
  Meeting,
  "_id" | "createdBy" | "participantIds" | "additionalReminderEmails"
>;
type EligibleRole = "ADMIN" | "DOSEN";

const EXTRA_RECIPIENT_PREFIX = "email:";
const EMAIL_PATTERN = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;

function isEligibleRole(
  role: UserReminderContact["role"],
): role is EligibleRole {
  return role === "ADMIN" || role === "DOSEN";
}

function displayNameFor(entry: UserReminderContact): string {
  const fallback = entry.email.split("@", 1)[0] || entry.email;
  return entry.displayName?.trim() || fallback;
}

function eligibleWhatsAppNumber(entry: UserReminderContact): string | null {
  if (entry.whatsappOptIn !== true) return null;

  const number = normalizeE164(entry.whatsappNumber ?? "");
  const consentNumber = normalizeE164(entry.whatsappConsentNumber ?? "");
  if (!number.ok || !consentNumber.ok) return null;
  if (number.value !== consentNumber.value) return null;

  return number.value;
}

export function filterEligibleReminderRecipients(
  entries: UserReminderContact[],
  channel: MeetingReminderChannel = "EMAIL",
): MeetingReminderRecipient[] {
  const seen = new Set<string>();
  const recipients: MeetingReminderRecipient[] = [];

  for (const entry of entries) {
    if (!entry._id || !entry.isActive || !isEligibleRole(entry.role)) {
      continue;
    }

    const whatsappNumber =
      channel === "WHATSAPP" ? eligibleWhatsAppNumber(entry) : null;
    if (channel === "WHATSAPP" && !whatsappNumber) {
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
      whatsappNumber,
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
  channel: MeetingReminderChannel = "EMAIL",
): Promise<MeetingReminderRecipient[]> {
  const entries = await findReminderContactsByIds(
    meetingReminderUserIds(meeting),
  );
  const recipients = filterEligibleReminderRecipients(entries, channel);

  // WhatsApp reminders require a consenting phone number, so extra addresses
  // only apply to the email channel.
  if (channel !== "EMAIL") return recipients;

  // Deduplicate against the active ADMIN/DOSEN addresses already resolved for
  // this meeting so nobody receives the same reminder twice.
  const seen = new Set(
    recipients.map((recipient) => recipient.email.trim().toLowerCase()),
  );
  for (const candidate of meeting.additionalReminderEmails ?? []) {
    const email = candidate.trim().toLowerCase();
    if (!email || seen.has(email) || !EMAIL_PATTERN.test(email)) continue;
    seen.add(email);
    recipients.push({
      userId: `${EXTRA_RECIPIENT_PREFIX}${email}`,
      email,
      displayName: email,
      role: "DOSEN",
      whatsappNumber: null,
    });
  }

  return recipients.sort((left, right) =>
    left.userId.localeCompare(right.userId),
  );
}

export async function resolveEligibleReminderRecipient(
  meeting: ReminderMeeting,
  userId: string,
  channel: MeetingReminderChannel = "EMAIL",
): Promise<MeetingReminderRecipient | null> {
  if (userId.startsWith(EXTRA_RECIPIENT_PREFIX)) {
    if (channel !== "EMAIL") return null;
    const email = userId.slice(EXTRA_RECIPIENT_PREFIX.length);
    const stillListed = (meeting.additionalReminderEmails ?? []).some(
      (candidate) => candidate.trim().toLowerCase() === email,
    );
    if (!stillListed || !EMAIL_PATTERN.test(email)) return null;
    return {
      userId,
      email,
      displayName: email,
      role: "DOSEN",
      whatsappNumber: null,
    };
  }

  if (!ObjectId.isValid(userId)) return null;

  const isCreator = meeting.createdBy?.toString() === userId;
  const isParticipant = (meeting.participantIds ?? []).some(
    (id) => id.toString() === userId,
  );

  if (!isCreator && !isParticipant) return null;

  const [entry] = await findReminderContactsByIds([new ObjectId(userId)]);
  if (!entry) return null;

  return filterEligibleReminderRecipients([entry], channel)[0] ?? null;
}

export async function resolveMeetingOrganizerName(
  meeting: ReminderMeeting,
): Promise<string> {
  if (!meeting.createdBy) return "RAMS";

  const [entry] = await findUsersByIds([meeting.createdBy]);
  if (!entry) return "RAMS";
  return displayNameFor(entry);
}
