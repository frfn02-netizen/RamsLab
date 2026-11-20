import type { MeetingMode, MeetingStatus } from "@/types/meetings";

export interface PublicScheduleMeeting {
  id: string;
  title: string;
  clientName: string | null;
  startAt: string;
  endAt: string;
  mode: MeetingMode | null;
  location: string | null;
  meetingLink: string | null;
  primaryPicName?: string | null;
  additionalPicNames?: string[];
  status: MeetingStatus;
}

export interface PublicSchedulePage {
  items: PublicScheduleMeeting[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
}
