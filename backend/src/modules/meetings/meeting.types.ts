import { ObjectId } from "mongodb";
import type { UserRole } from "../users/user.types.js";

export interface MeetingAttachment {
  id: string;
  url: string;
  publicId: string;
  filename: string;
  mimeType: string;
  size: number;
  uploadedAt: Date;
}

export interface Meeting {
  _id?: ObjectId;
  title: string;
  description: string;
  startAt: Date;
  endAt: Date;
  createdBy: ObjectId;
  participantIds: ObjectId[];
  meetingLink: string | null;
  attachments: MeetingAttachment[];
  createdAt: Date;
  updatedAt: Date;
}

export interface MeetingUserSummary {
  id: string;
  email: string;
  role: UserRole;
}

export interface MeetingAttachmentResponse {
  id: string;
  url: string;
  filename: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
}

export interface MeetingResponse {
  _id: string;
  title: string;
  description: string;
  startAt: string;
  endAt: string;
  createdBy: MeetingUserSummary | null;
  participants: MeetingUserSummary[];
  participantIds: string[];
  meetingLink: string | null;
  attachments: MeetingAttachmentResponse[];
  createdAt: string;
  updatedAt: string;
  canEdit: boolean;
}

export interface MeetingConflict {
  _id: string;
  title: string;
  startAt: string;
  endAt: string;
  participants: MeetingUserSummary[];
}
