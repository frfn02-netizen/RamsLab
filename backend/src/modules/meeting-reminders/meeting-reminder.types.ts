import type { ObjectId } from "mongodb";
import type { EmailFailureReason } from "../../lib/mailjet.js";
import type { UserRole } from "../users/user.types.js";

export const MEETING_REMINDER_DELIVERY_STATUSES = [
  "pending",
  "sending",
  "sent",
  "failed",
  "cancelled",
  "missed",
  "unknown",
] as const;

export type MeetingReminderDeliveryStatus =
  (typeof MEETING_REMINDER_DELIVERY_STATUSES)[number];

export const MEETING_REMINDER_CHANNELS = ["EMAIL", "WHATSAPP"] as const;
export type MeetingReminderChannel = (typeof MEETING_REMINDER_CHANNELS)[number];

export type MeetingReminderFailureReason =
  | EmailFailureReason
  | "lease_expired"
  | "invalid_recipient_address"
  | "recipient_ineligible";

export interface MeetingReminderDelivery {
  _id?: ObjectId;
  meetingId: ObjectId;
  meetingStartAt: Date;
  intervalMinutes: number;
  recipientKind: "USER";
  recipientId: string;
  scheduledFor: Date;
  channel?: MeetingReminderChannel;
  status: MeetingReminderDeliveryStatus;
  attempts: number;
  nextAttemptAt: Date | null;
  leaseOwner: string | null;
  leaseExpiresAt: Date | null;
  lastAttemptAt: Date | null;
  sentAt: Date | null;
  provider: string | null;
  providerMessageId: string | null;
  lastFailureReason: MeetingReminderFailureReason | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface MeetingReminderDeliveryKey {
  meetingId: ObjectId;
  meetingStartAt: Date;
  intervalMinutes: number;
  recipientKind: "USER";
  recipientId: string;
  scheduledFor: Date;
  channel: MeetingReminderChannel;
}

export interface MeetingReminderRecipient {
  userId: string;
  email: string;
  displayName: string;
  role: Extract<UserRole, "ADMIN" | "DOSEN">;
  whatsappNumber: string | null;
}

export type ReminderFailureDisposition = "retryable" | "rejected" | "ambiguous";

export interface MeetingReminderCycleSummary {
  scannedMeetings: number;
  createdDeliveries: number;
  revivedDeliveries: number;
  cancelledDeliveries: number;
  sent: number;
  retried: number;
  failed: number;
  unknown: number;
  missed: number;
}
