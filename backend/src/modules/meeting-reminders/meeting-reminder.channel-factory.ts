import type { MeetingReminderChannelAdapter } from "./meeting-reminder.channel.js";
import type { MeetingReminderChannel } from "./meeting-reminder.types.js";
import { EmailMeetingReminderChannel } from "./channels/email.js";
import { createMetaWhatsAppCloudTransport } from "./channels/meta-whatsapp.js";
import {
  WhatsAppMeetingReminderChannel,
  type WhatsAppGatewayTransport,
} from "./channels/whatsapp.js";

export interface MeetingReminderChannelAdapterOptions {
  whatsappTransport?: WhatsAppGatewayTransport;
}

export function createMeetingReminderChannelAdapter(
  channel: MeetingReminderChannel,
  options: MeetingReminderChannelAdapterOptions = {},
): MeetingReminderChannelAdapter {
  if (channel === "WHATSAPP") {
    return new WhatsAppMeetingReminderChannel(
      options.whatsappTransport ?? createMetaWhatsAppCloudTransport(),
    );
  }
  return new EmailMeetingReminderChannel();
}
