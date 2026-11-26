import { describe, expect, it, vi } from "vitest";
import { ObjectId } from "mongodb";

import type { Meeting } from "../src/modules/meetings/meeting.types.js";
import type { MeetingReminderMessage } from "../src/modules/meeting-reminders/meeting-reminder.channel.js";
import {
  WhatsAppMeetingReminderChannel,
  type WhatsAppGatewayMessage,
  type WhatsAppGatewayTransport,
} from "../src/modules/meeting-reminders/channels/whatsapp.js";

const meeting = {
  _id: new ObjectId("000000000000000000000010"),
  title: "Research sync",
  description: "Discuss progress",
  startAt: new Date("2040-01-02T00:00:00.000Z"),
  endAt: new Date("2040-01-02T01:00:00.000Z"),
  meetingLink: "https://meet.example.com/abc",
} as Meeting;

const message: MeetingReminderMessage = {
  meeting,
  recipient: {
    userId: "000000000000000000000011",
    email: "recipient@example.com",
    displayName: "Recipient",
    role: "DOSEN",
    whatsappNumber: "+6281234567890",
  },
  organizerName: "Organizer",
  timezone: "Asia/Jakarta",
  intervalMinutes: 1440,
};

function fakeTransport() {
  const sent: WhatsAppGatewayMessage[] = [];
  const transport: WhatsAppGatewayTransport = {
    name: "fake-gateway",
    isConfigured: true,
    async send(value) {
      sent.push(value);
      return { accepted: true, providerMessageId: "wamid.1" };
    },
  };
  return { transport, sent };
}

describe("WhatsApp reminder channel", () => {
  it("normalizes provider acceptance without claiming delivery", async () => {
    const { transport, sent } = fakeTransport();
    const adapter = new WhatsAppMeetingReminderChannel(transport);

    const result = await adapter.send(message);

    expect(result).toEqual({
      disposition: "accepted",
      provider: "fake-gateway",
      providerMessageId: "wamid.1",
    });
    expect(sent).toHaveLength(1);
    expect(sent[0]?.to).toBe("+6281234567890");
    expect(sent[0]?.detailUrl).toContain("/meetings/000000000000000000000010");
  });

  it("does not call the gateway when the channel is not configured", async () => {
    const send = vi.fn();
    const adapter = new WhatsAppMeetingReminderChannel({
      name: "disabled",
      isConfigured: false,
      send,
    });

    const result = await adapter.send(message);

    expect(result.disposition).toBe("rejected");
    expect(result.reason).toBe("not_configured");
    expect(send).not.toHaveBeenCalled();
  });

  it("rejects an invalid recipient number before calling the gateway", async () => {
    const send = vi.fn();
    const adapter = new WhatsAppMeetingReminderChannel({
      name: "fake-gateway",
      isConfigured: true,
      send,
    });

    const result = await adapter.send({
      ...message,
      recipient: { ...message.recipient, whatsappNumber: "0812" },
    });

    expect(result.disposition).toBe("rejected");
    expect(result.reason).toBe("invalid_recipient_address");
    expect(send).not.toHaveBeenCalled();
  });

  it("maps ambiguous transport failures without retrying inside the adapter", async () => {
    const adapter = new WhatsAppMeetingReminderChannel({
      name: "fake-gateway",
      isConfigured: true,
      async send() {
        return { accepted: false, reason: "timeout" };
      },
    });

    const result = await adapter.send(message);

    expect(result.disposition).toBe("ambiguous");
    expect(result.reason).toBe("timeout");
  });
});
