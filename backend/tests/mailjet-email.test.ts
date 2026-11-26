import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  getMailjetConfigurationDiagnostics,
  sendEmail,
  setMailjetTransportForTesting,
} from "../src/lib/mailjet.js";

const API_KEY = "mailjet-test-key";
const SECRET_KEY = "mailjet-test-secret";
const SENDER_EMAIL = "no-reply@rams.test";
const RECIPIENT = "recipient@example.com";
const ENV_KEYS = [
  "MAILJET_API_KEY",
  "MAILJET_SECRET_KEY",
  "MAILJET_API_SECRET",
  "MAILJET_SENDER_EMAIL",
  "MAILJET_SENDER_NAME",
  "MAILJET_DRY_RUN",
  "NODE_ENV",
] as const;
const originalEnv = Object.fromEntries(
  ENV_KEYS.map((key) => [key, process.env[key]]),
) as Record<(typeof ENV_KEYS)[number], string | undefined>;

function restoreEnv() {
  for (const key of ENV_KEYS) {
    const value = originalEnv[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

function successResponse(messageId = "mailjet-message-id") {
  return new Response(
    JSON.stringify({
      Messages: [
        {
          Status: "success",
          To: [{ Email: RECIPIENT, MessageID: messageId }],
        },
      ],
    }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
}

beforeEach(() => {
  process.env.MAILJET_API_KEY = API_KEY;
  process.env.MAILJET_SECRET_KEY = SECRET_KEY;
  delete process.env.MAILJET_API_SECRET;
  process.env.MAILJET_SENDER_EMAIL = SENDER_EMAIL;
  process.env.MAILJET_SENDER_NAME = "RAMS Platform";
  delete process.env.MAILJET_DRY_RUN;
  setMailjetTransportForTesting(null);
});

afterEach(() => {
  restoreEnv();
  setMailjetTransportForTesting(null);
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("Mailjet client", () => {
  it("sends a message with Basic auth and the v3.1 payload", async () => {
    const transport = vi.fn().mockResolvedValue(successResponse());
    setMailjetTransportForTesting(transport);

    const result = await sendEmail({
      to: RECIPIENT,
      subject: "RAMS test",
      text: "Hello",
      html: "<p>Hello</p>",
    });

    expect(result).toEqual({
      sent: true,
      status: "accepted",
      provider: "mailjet",
      providerMessageId: "mailjet-message-id",
    });

    expect(transport).toHaveBeenCalledTimes(1);
    const [url, init] = transport.mock.calls[0];
    expect(url).toBe("https://api.mailjet.com/v3.1/send");
    expect(init).toMatchObject({
      method: "POST",
      signal: expect.any(AbortSignal),
      headers: {
        Authorization: `Basic ${Buffer.from(`${API_KEY}:${SECRET_KEY}`).toString("base64")}`,
        "Content-Type": "application/json",
      },
    });

    const body = JSON.parse(String(init.body));
    expect(body).toEqual({
      Messages: [
        {
          From: { Email: SENDER_EMAIL, Name: "RAMS Platform" },
          To: [{ Email: RECIPIENT }],
          Subject: "RAMS test",
          TextPart: "Hello",
          HTMLPart: "<p>Hello</p>",
        },
      ],
    });
  });

  it("dry-runs in the test environment without calling the network", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});

    const result = await sendEmail({
      to: RECIPIENT,
      subject: "Dry run",
      text: "Hello",
    });

    expect(result).toEqual({
      sent: true,
      status: "accepted",
      provider: "mailjet",
    });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(infoSpy).toHaveBeenCalledWith(
      "Mailjet dry run: message not sent",
      { recipients: [RECIPIENT], subject: "Dry run" },
    );
  });

  it("honors MAILJET_DRY_RUN outside the test environment", async () => {
    process.env.NODE_ENV = "production";
    process.env.MAILJET_DRY_RUN = "true";
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(console, "info").mockImplementation(() => {});

    const result = await sendEmail({
      to: RECIPIENT,
      subject: "Dry run",
      text: "Hello",
    });

    expect(result.sent).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("maps provider HTTP failures to sanitized reasons", async () => {
    setMailjetTransportForTesting(async () =>
      new Response("upstream error", { status: 503 }),
    );
    await expect(
      sendEmail({ to: RECIPIENT, subject: "Test", text: "Hello" }),
    ).resolves.toMatchObject({
      sent: false,
      status: "failed",
      reason: "provider_error",
      httpStatus: 503,
    });

    setMailjetTransportForTesting(async () =>
      new Response("unauthorized", { status: 401 }),
    );
    await expect(
      sendEmail({ to: RECIPIENT, subject: "Test", text: "Hello" }),
    ).resolves.toMatchObject({
      sent: false,
      reason: "authentication_failed",
      httpStatus: 401,
    });
  });

  it("returns not_configured without credentials", async () => {
    delete process.env.MAILJET_API_KEY;
    const transport = vi.fn();
    setMailjetTransportForTesting(transport);

    const result = await sendEmail({
      to: RECIPIENT,
      subject: "Test",
      text: "Hello",
    });

    expect(result).toMatchObject({
      sent: false,
      status: "not_configured",
      reason: "not_configured",
    });
    expect(transport).not.toHaveBeenCalled();
  });

  it("rejects malformed recipients before sending", async () => {
    const transport = vi.fn();
    setMailjetTransportForTesting(transport);

    const result = await sendEmail({
      to: "not-an-email",
      subject: "Test",
      text: "Hello",
    });

    expect(result).toMatchObject({
      sent: false,
      reason: "envelope_rejected",
    });
    expect(transport).not.toHaveBeenCalled();
  });

  it("reports sanitized configuration diagnostics", () => {
    const diagnostics = getMailjetConfigurationDiagnostics();

    expect(diagnostics.provider).toBe("mailjet");
    expect(diagnostics.mailjetConfigured).toBe(true);
    expect(diagnostics.mailjetApiKeyConfigured).toBe(true);
    expect(diagnostics.mailjetSecretKeyConfigured).toBe(true);
    expect(diagnostics.mailjetSenderEmailConfigured).toBe(true);
    expect(diagnostics.mailjetSenderDomain).toBe("rams.test");
    expect(JSON.stringify(diagnostics)).not.toContain(API_KEY);
    expect(JSON.stringify(diagnostics)).not.toContain(SECRET_KEY);
  });

});
