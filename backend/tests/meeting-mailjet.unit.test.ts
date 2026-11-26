import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  sendMeetingEmail,
  setMailjetTransportForTesting,
} from "../src/lib/mailjet.js";

const ENV_KEYS = [
  "MAILJET_API_KEY",
  "MAILJET_SECRET_KEY",
  "MAILJET_SENDER_EMAIL",
  "MAILJET_SENDER_NAME",
] as const;
const originalEnv = Object.fromEntries(
  ENV_KEYS.map((key) => [key, process.env[key]]),
) as Record<(typeof ENV_KEYS)[number], string | undefined>;

beforeEach(() => {
  process.env.MAILJET_API_KEY = "test-key";
  process.env.MAILJET_SECRET_KEY = "test-secret";
  process.env.MAILJET_SENDER_EMAIL = "no-reply@rams.test";
  process.env.MAILJET_SENDER_NAME = "RAMS Platform";
});

afterEach(() => {
  for (const key of ENV_KEYS) {
    const value = originalEnv[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  setMailjetTransportForTesting(null);
  vi.unstubAllGlobals();
});

const meeting = {
  title: "Safety review",
  startAt: new Date("2042-01-02T02:00:00.000Z"),
  endAt: new Date("2042-01-02T03:00:00.000Z"),
  location: "RAMS Meeting Room",
  meetingLink: null,
};

describe("meeting Mailjet service", () => {
  it("sends the localized meeting payload with Basic auth", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ Messages: [{ Status: "success" }] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    setMailjetTransportForTesting(fetchMock);

    const result = await sendMeetingEmail({
      meeting,
      organizerName: "Budi Santoso",
      recipient: { email: "member@example.com", name: "Member" },
      kind: "created",
      locale: "id",
    });

    expect(result).toEqual({ success: true });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.mailjet.com/v3.1/send",
      expect.objectContaining({
        method: "POST",
        signal: expect.any(AbortSignal),
        headers: expect.objectContaining({
          Authorization: `Basic ${Buffer.from("test-key:test-secret").toString("base64")}`,
        }),
      }),
    );

    const body = JSON.parse(String(fetchMock.mock.calls[0][1].body));
    expect(body.Messages[0].TextPart).toContain("Safety review");
    expect(body.Messages[0].TextPart).toContain("WIB");
    expect(body.Messages[0].HTMLPart).toContain("Budi Santoso");
  });

  it("returns a sanitized failure without throwing on provider errors", async () => {
    setMailjetTransportForTesting(
      vi.fn().mockResolvedValue(new Response("upstream error", { status: 503 })),
    );

    await expect(
      sendMeetingEmail({
        meeting,
        organizerName: "Budi Santoso",
        recipient: { email: "member@example.com" },
        kind: "reminder",
      }),
    ).resolves.toEqual({ success: false, error: "provider_error" });
  });
});
