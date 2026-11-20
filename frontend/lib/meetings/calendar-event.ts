import { getMeetingStatus } from "./status";
import type { Meeting, MeetingCalendarEvent } from "@/types/meetings";

export function meetingToCalendarEvent(
  meeting: Meeting,
): MeetingCalendarEvent {
  const primaryPic =
    meeting.primaryPic ??
    meeting.pics?.find((pic) => pic.id === meeting.primaryPicId);
  const additionalPicNames = (
    meeting.additionalPics ??
    meeting.pics?.filter((pic) => pic.id !== meeting.primaryPicId) ??
    []
  )
    .map((pic) => pic.displayName?.trim() || pic.email.split("@", 1)[0])
    .filter(Boolean);

  return {
    _id: meeting._id,
    title: meeting.title,
    startAt: meeting.startAt,
    endAt: meeting.endAt,
    createdBy: meeting.createdBy
      ? {
          id: meeting.createdBy.id,
          displayName: meeting.createdBy.displayName,
          role: meeting.createdBy.role,
        }
      : null,
    canViewDetails: true,
    status: meeting.status ?? getMeetingStatus(meeting),
    clientName: meeting.clientName,
    mode: meeting.mode,
    location: meeting.location,
    ...(primaryPic?.displayName
      ? { primaryPicName: primaryPic.displayName }
      : {}),
    ...(additionalPicNames.length > 0 ? { additionalPicNames } : {}),
    involvesHighlightedUser: meeting.involvesHighlightedUser,
  };
}
