import { ObjectId } from "mongodb";
import type { UserRole } from "../users/user.types.js";

export const MEETING_MODES = ["OFFLINE", "ONLINE"] as const;
export type MeetingMode = (typeof MEETING_MODES)[number];

export const MEETING_STATUSES = [
  "UPCOMING",
  "ONGOING",
  "PAST",
  "CANCELLED",
] as const;
export type MeetingStatus = (typeof MEETING_STATUSES)[number];

export interface MeetingAttachment {
  id: string;
  url: string;
  publicId: string;
  filename: string;
  mimeType: string;
  size: number;
  uploadedAt: Date;
}

export interface ExternalParticipant {
  id?: string;
  fullName: string;
  email?: string;
  organization?: string;
}

export interface MeetingGuestInvitation {
  externalParticipantId: string;
  tokenHash: string;
  createdAt: Date;
  expiresAt: Date;
  revokedAt?: Date;
}

export interface Meeting {
  _id?: ObjectId;
  title: string;
  description: string;
  clientName?: string | null;
  mode?: MeetingMode | null;
  location?: string | null;
  guestDescription?: string;
  startAt: Date;
  endAt: Date;
  createdBy: ObjectId;
  primaryPicId?: ObjectId;
  picIds?: ObjectId[];
  organizerId?: ObjectId;
  delegatedUserIds?: ObjectId[];
  participantIds: ObjectId[];
  externalParticipants?: ExternalParticipant[];
  meetingLink: string | null;
  /** Extra reminder recipients without internal accounts. Email channel only. */
  additionalReminderEmails?: string[];
  cancelledAt?: Date;
  cancelledBy?: ObjectId;
  cancellationReason?: string;
  guestInvitations?: MeetingGuestInvitation[];
  attachments: MeetingAttachment[];
  createdAt: Date;
  updatedAt: Date;
}

export interface MeetingUserSummary {
  id: string;
  displayName?: string;
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
  clientName: string | null;
  mode: MeetingMode | null;
  location: string | null;
  startAt: string;
  endAt: string;
  createdBy: MeetingUserSummary | null;
  primaryPicId?: string;
  picIds?: string[];
  pics?: MeetingUserSummary[];
  primaryPic?: MeetingUserSummary;
  additionalPics?: MeetingUserSummary[];
  participants: MeetingUserSummary[];
  participantIds: string[];
  meetingLink: string | null;
  additionalReminderEmails: string[];
  status: MeetingStatus;
  cancelledAt: string | null;
  cancelledBy: string | null;
  cancellationReason: string | null;
  attachments: MeetingAttachmentResponse[];
  createdAt: string;
  updatedAt: string;
  canEdit: boolean;
  canCancel: boolean;
  canDelete: boolean;
  isOrganizer: boolean;
  involvesHighlightedUser: boolean;
}

export interface MeetingCalendarCreator {
  id: string;
  displayName?: string;
  role: UserRole;
}

export interface MeetingCalendarResponse {
  _id: string;
  title: string;
  startAt: string;
  endAt: string;
  createdBy: MeetingCalendarCreator | null;
  canViewDetails: boolean;
  status?: MeetingStatus;
  clientName?: string | null;
  mode?: MeetingMode | null;
  location?: string | null;
  primaryPicName?: string;
  additionalPicNames?: string[];
  involvesHighlightedUser?: boolean;
}

export interface MeetingConflict {
  busy: boolean;
  _id?: string;
  title?: string;
  startAt?: string;
  endAt?: string;
  participants?: MeetingUserSummary[];
}
