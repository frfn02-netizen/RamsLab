import type { MeetingMode, MeetingStatus } from "../meetings/meeting.types.js";

export interface PublicScheduleMeeting {
  id: string;
  title: string;
  clientName: string | null;
  startAt: string;
  endAt: string;
  mode: MeetingMode | null;
  location: string | null;
  meetingLink: string | null;
  primaryPicName: string | null;
  additionalPicNames: string[];
  status: MeetingStatus;
}

export interface PublicScheduleQuery {
  page: number;
  limit: number;
  q?: string;
  mode?: MeetingMode;
  from?: Date;
  to?: Date;
}
