import type { Meeting } from "../meetings/meeting.types.js";
import type {
  MeetingReminderChannel,
  MeetingReminderFailureReason,
  MeetingReminderRecipient,
  ReminderFailureDisposition,
} from "./meeting-reminder.types.js";

export type MeetingReminderSendDisposition =
  "accepted" | ReminderFailureDisposition;

export interface MeetingReminderMessage {
  meeting: Meeting;
  recipient: MeetingReminderRecipient;
  organizerName: string;
  timezone: string;
  intervalMinutes: number;
}

export interface MeetingReminderSendResult {
  disposition: MeetingReminderSendDisposition;
  provider: string;
  providerMessageId?: string;
  httpStatus?: number;
  reason?: MeetingReminderFailureReason;
}

export interface MeetingReminderChannelAdapter {
  readonly channel: MeetingReminderChannel;
  readonly name: string;
  readonly isConfigured: boolean;
  send(message: MeetingReminderMessage): Promise<MeetingReminderSendResult>;
}

const REJECTED_REASONS = new Set<MeetingReminderFailureReason>([
  "not_configured",
  "authentication_failed",
  "envelope_rejected",
  "invalid_recipient_address",
]);

export function classifyProviderFailure(result: {
  reason?: MeetingReminderFailureReason | null;
  httpStatus?: number;
}): ReminderFailureDisposition {
  if (result.reason === "provider_error") {
    if (result.httpStatus === 429) return "retryable";
    if (
      result.httpStatus !== undefined &&
      [400, 401, 403, 404, 409, 413, 422].includes(result.httpStatus)
    ) {
      return "rejected";
    }
    return "ambiguous";
  }

  if (result.reason && REJECTED_REASONS.has(result.reason)) {
    return "rejected";
  }

  return "ambiguous";
}
