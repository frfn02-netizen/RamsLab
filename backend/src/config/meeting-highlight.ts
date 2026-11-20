import { ObjectId } from "mongodb";

export function parseMeetingHighlightedUserIds(
  raw: string | undefined,
): ReadonlySet<string> {
  const ids = new Set<string>();
  for (const value of (raw ?? "").split(",")) {
    const trimmed = value.trim();
    if (!trimmed) continue;
    if (!ObjectId.isValid(trimmed)) {
      throw new Error(
        "MEETINGS_HIGHLIGHTED_USER_IDS must contain comma-separated MongoDB user IDs",
      );
    }
    ids.add(new ObjectId(trimmed).toHexString());
  }
  return ids;
}

export const MEETINGS_HIGHLIGHTED_USER_IDS =
  parseMeetingHighlightedUserIds(process.env.MEETINGS_HIGHLIGHTED_USER_IDS);

export function isMeetingHighlightedUser(
  userId: ObjectId | string | null | undefined,
  highlightedUserIds: ReadonlySet<string> = MEETINGS_HIGHLIGHTED_USER_IDS,
): boolean {
  if (!userId) return false;
  return highlightedUserIds.has(userId.toString());
}

export function meetingInvolvesHighlightedUser(
  meeting: {
    createdBy?: ObjectId | null;
    participantIds?: ObjectId[];
  },
  highlightedUserIds: ReadonlySet<string> = MEETINGS_HIGHLIGHTED_USER_IDS,
): boolean {
  if (highlightedUserIds.size === 0) return false;
  if (isMeetingHighlightedUser(meeting.createdBy, highlightedUserIds)) {
    return true;
  }
  return (meeting.participantIds ?? []).some((userId) =>
    isMeetingHighlightedUser(userId, highlightedUserIds),
  );
}
