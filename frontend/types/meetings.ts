import type { UserRole } from "@/types/auth";

export const MEETING_VISIBILITIES = ["INTERNAL", "PRIVATE"] as const;
export type MeetingVisibility = (typeof MEETING_VISIBILITIES)[number];

export const MEETING_MODES = ["OFFLINE", "ONLINE"] as const;
export type MeetingMode = (typeof MEETING_MODES)[number];

export const MEETING_STATUSES = [
  "UPCOMING",
  "ONGOING",
  "PAST",
  "CANCELLED",
] as const;
export type MeetingStatus = (typeof MEETING_STATUSES)[number];

export type MeetingAuditAction =
  | "CREATE"
  | "UPDATE"
  | "CANCEL"
  | "ATTACHMENT_ADDED"
  | "ATTACHMENT_REMOVED"
  | "DELEGATE_ASSIGNED"
  | "DELEGATE_REVOKED"
  | "GUEST_INVITATION_CREATED"
  | "GUEST_INVITATION_REVOKED"
  | "GUEST_INVITATION_REGENERATED";

export interface MeetingAuditChange {
  oldValue: unknown;
  newValue: unknown;
}

export interface MeetingAuditEntry {
  id: string;
  actorId: string;
  actor: MeetingUserSummary | null;
  action: MeetingAuditAction;
  changes: Record<string, MeetingAuditChange>;
  timestamp: string;
}

export interface MeetingUserSummary {
  id: string;
  displayName?: string;
  email: string;
  role: UserRole;
}

export interface MeetingAttachment {
  id: string;
  url: string;
  filename: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
}

export interface Meeting {
  _id: string;
  title: string;
  description: string;
  clientName: string | null;
  mode: MeetingMode | null;
  location: string | null;
  startAt: string;
  endAt: string;
  visibility?: MeetingVisibility;
  createdBy: MeetingUserSummary | null;
  primaryPicId?: string;
  picIds?: string[];
  pics?: MeetingUserSummary[];
  primaryPic?: MeetingUserSummary;
  additionalPics?: MeetingUserSummary[];
  participants: MeetingUserSummary[];
  participantIds: string[];
  meetingLink: string | null;
  status?: MeetingStatus;
  cancelledAt?: string | null;
  cancelledBy?: string | null;
  cancellationReason?: string | null;
  attachments: MeetingAttachment[];
  createdAt: string;
  updatedAt: string;
  canEdit: boolean;
  canCancel?: boolean;
  canDelete?: boolean;
  isOrganizer?: boolean;
  involvesHighlightedUser?: boolean;
}

export interface MeetingCalendarCreator {
  id: string;
  displayName?: string;
  role: UserRole;
}

export interface MeetingCalendarEvent {
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
  meetingLink?: string | null;
  primaryPicName?: string;
  additionalPicNames?: string[];
  involvesHighlightedUser?: boolean;
}

export interface MeetingAgendaPagination {
  limit: number;
  offset: number;
  hasMore: boolean;
  nextOffset: number | null;
}

export interface MeetingAgendaPage {
  items: MeetingCalendarEvent[];
  pagination: MeetingAgendaPagination;
}

export interface MeetingConflict {
  busy: boolean;
  _id?: string;
  title?: string;
  startAt?: string;
  endAt?: string;
  participants?: MeetingUserSummary[];
}

export interface MeetingInput {
  title: string;
  description: string;
  clientName: string;
  mode: MeetingMode;
  location: string | null;
  startAt: string;
  endAt: string;
  visibility: MeetingVisibility;
  primaryPicId: string;
  picIds: string[];
  participantIds: string[];
  meetingLink: string | null;
}

export type MeetingUpdateInput = Partial<MeetingInput> & {
  expectedUpdatedAt?: string;
};

export interface MeetingSaveResult {
  meeting: Meeting;
  conflicts: MeetingConflict[];
}

export interface UserDirectoryEntry {
  id: string;
  displayName?: string;
  email: string;
  role: UserRole;
}
