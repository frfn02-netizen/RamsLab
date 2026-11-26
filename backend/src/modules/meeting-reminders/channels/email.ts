import { isMailjetConfigured, sendEmail } from "../../../lib/mailjet.js";
import {
  classifyProviderFailure,
  type MeetingReminderChannelAdapter,
  type MeetingReminderMessage,
  type MeetingReminderSendResult,
} from "../meeting-reminder.channel.js";
import { renderMeetingReminderEmail } from "../meeting-reminder.template.js";

export class EmailMeetingReminderChannel implements MeetingReminderChannelAdapter {
  readonly channel = "EMAIL" as const;
  readonly name = "email";

  get isConfigured() {
    return isMailjetConfigured();
  }

  async send(
    message: MeetingReminderMessage,
  ): Promise<MeetingReminderSendResult> {
    const rendered = renderMeetingReminderEmail({
      meeting: message.meeting,
      recipient: message.recipient,
      organizerName: message.organizerName,
      timezone: message.timezone,
    });

    const result = await sendEmail({
      to: message.recipient.email,
      subject: rendered.subject,
      text: rendered.text,
      html: rendered.html,
    });

    if (result.sent) {
      return {
        disposition: "accepted",
        provider: result.provider,
        ...(result.providerMessageId
          ? { providerMessageId: result.providerMessageId }
          : {}),
      };
    }

    const reason = result.reason ?? "provider_error";
    return {
      disposition: classifyProviderFailure({
        reason,
        httpStatus: result.httpStatus,
      }),
      provider: result.provider,
      ...(result.httpStatus !== undefined
        ? { httpStatus: result.httpStatus }
        : {}),
      reason,
    };
  }
}
