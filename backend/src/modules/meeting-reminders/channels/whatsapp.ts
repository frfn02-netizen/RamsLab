import { isValidE164 } from "../../../lib/phone.js";
import { isSafeHttpUrl } from "../../../lib/url-security.js";
import {
  classifyProviderFailure,
  type MeetingReminderChannelAdapter,
  type MeetingReminderMessage,
  type MeetingReminderSendResult,
} from "../meeting-reminder.channel.js";
import { buildMeetingReminderDetailUrl } from "../meeting-reminder.template.js";
import type {
  MeetingReminderFailureReason,
  ReminderFailureDisposition,
} from "../meeting-reminder.types.js";

export interface WhatsAppGatewayMessage {
  to: string;
  recipientName: string;
  meetingTitle: string;
  startAt: Date;
  endAt: Date;
  organizerName: string;
  meetingLink: string | null;
  detailUrl: string | null;
  intervalMinutes: number;
  timezone: string;
}

export interface WhatsAppGatewayResult {
  accepted: boolean;
  providerMessageId?: string;
  httpStatus?: number;
  reason?: MeetingReminderFailureReason;
  disposition?: ReminderFailureDisposition;
}

export interface WhatsAppGatewayTransport {
  readonly name: string;
  readonly isConfigured: boolean;
  send(message: WhatsAppGatewayMessage): Promise<WhatsAppGatewayResult>;
}

export const disabledWhatsAppGatewayTransport: WhatsAppGatewayTransport = {
  name: "disabled",
  isConfigured: false,
  async send() {
    return {
      accepted: false,
      reason: "not_configured",
      disposition: "rejected",
    };
  },
};

export class WhatsAppMeetingReminderChannel implements MeetingReminderChannelAdapter {
  readonly channel = "WHATSAPP" as const;
  readonly name: string;

  constructor(
    private readonly transport: WhatsAppGatewayTransport = disabledWhatsAppGatewayTransport,
  ) {
    this.name = transport.name;
  }

  get isConfigured() {
    return this.transport.isConfigured;
  }

  async send(
    message: MeetingReminderMessage,
  ): Promise<MeetingReminderSendResult> {
    if (!this.transport.isConfigured) {
      return {
        disposition: "rejected",
        provider: this.transport.name,
        reason: "not_configured",
      };
    }

    const to = message.recipient.whatsappNumber;
    if (!to || !isValidE164(to)) {
      return {
        disposition: "rejected",
        provider: this.transport.name,
        reason: "invalid_recipient_address",
      };
    }

    const meetingLink =
      message.meeting.meetingLink && isSafeHttpUrl(message.meeting.meetingLink)
        ? message.meeting.meetingLink
        : null;
    const detailUrl = message.meeting._id
      ? buildMeetingReminderDetailUrl(message.meeting._id.toString())
      : null;

    const result = await this.transport.send({
      to,
      recipientName: message.recipient.displayName,
      meetingTitle: message.meeting.title,
      startAt: message.meeting.startAt,
      endAt: message.meeting.endAt,
      organizerName: message.organizerName,
      meetingLink,
      detailUrl,
      intervalMinutes: message.intervalMinutes,
      timezone: message.timezone,
    });

    if (result.accepted) {
      return {
        disposition: "accepted",
        provider: this.transport.name,
        ...(result.providerMessageId
          ? { providerMessageId: result.providerMessageId }
          : {}),
      };
    }

    const reason = result.reason ?? "provider_error";
    return {
      disposition:
        result.disposition ??
        classifyProviderFailure({
          reason,
          httpStatus: result.httpStatus,
        }),
      provider: this.transport.name,
      ...(result.httpStatus !== undefined
        ? { httpStatus: result.httpStatus }
        : {}),
      reason,
    };
  }
}
