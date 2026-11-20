import { getMeetingStatus } from "../meetings/meeting.service.js";
import type { Meeting } from "../meetings/meeting.types.js";
import type { UserDirectoryEntry } from "../users/user.types.js";
import type { PublicScheduleMeeting } from "./public-schedule.types.js";

function displayName(entry: UserDirectoryEntry | undefined) {
  return entry?.displayName?.trim() || entry?.email.split("@", 1)[0] || null;
}

export function toPublicScheduleMeeting(
  meeting: Meeting,
  users: ReadonlyMap<string, UserDirectoryEntry> = new Map(),
): PublicScheduleMeeting {
  const primaryPicId = meeting.primaryPicId?.toString();
  const primaryPicName = primaryPicId
    ? displayName(users.get(primaryPicId))
    : null;
  const additionalPicNames = (meeting.picIds ?? [])
    .filter((id) => id.toString() !== primaryPicId)
    .map((id) => displayName(users.get(id.toString())))
    .filter((value): value is string => Boolean(value));

  return {
    id: meeting._id?.toString() ?? "",
    title: meeting.title,
    clientName: meeting.clientName?.trim() || null,
    startAt: meeting.startAt.toISOString(),
    endAt: meeting.endAt.toISOString(),
    mode: meeting.mode ?? null,
    location: meeting.location?.trim() || null,
    meetingLink: meeting.meetingLink ?? null,
    primaryPicName,
    additionalPicNames,
    status: getMeetingStatus(meeting),
  };
}
