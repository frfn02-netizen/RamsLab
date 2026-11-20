import type { MeetingCalendarEvent } from "@/types/meetings";
import type { PublicScheduleMeeting } from "@/types/public-schedule";

export function publicMeetingToCalendarEvent(
  meeting: PublicScheduleMeeting,
): MeetingCalendarEvent {
  return {
    _id: meeting.id,
    title: meeting.title,
    startAt: meeting.startAt,
    endAt: meeting.endAt,
    createdBy: null,
    canViewDetails: true,
    status: meeting.status,
    clientName: meeting.clientName,
    mode: meeting.mode,
    location: meeting.location,
    meetingLink: meeting.meetingLink,
    primaryPicName: meeting.primaryPicName ?? undefined,
    additionalPicNames: meeting.additionalPicNames,
  };
}
