import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  MailjetEmailProvider,
  sendEmail,
  setEmailProviderForTesting,
} from "../src/lib/email.js";

const MAILJET_API_KEY = "mailjet-test-key";
const MAILJET_API_SECRET = "mailjet-test-secret";
const MAILJET_SENDER_EMAIL = "no-reply@rams.test";
const MAILJET_SENDER_NAME = "RAMS Platform";
const RECIPIENT = "recipient@example.com";
const ENV_KEYS = [
  "EMAIL_PROVIDER",
  "EMAIL_FROM",
  "MAILJET_API_KEY",
  "MAILJET_API_SECRET",
  "MAILJET_SENDER_EMAIL",
  "MAILJET_SENDER_NAME",
] as const;

const originalEnv = Object.fromEntries(
  ENV_KEYS.map((key) => [key, process.env[key]]),
) as Record<(typeof ENV_KEYS)[number], string | undefined>;

function setMailjetEnv(overrides: Partial<Record<string, string>> = {}) {
  process.env.EMAIL_PROVIDER = "mailjet";
  process.env.MAILJET_API_KEY = overrides.MAILJET_API_KEY ?? MAILJET_API_KEY;
  process.env.MAILJET_API_SECRET =
    overrides.MAILJET_API_SECRET ?? MAILJET_API_SECRET;
  process.env.MAILJET_SENDER_EMAIL =
    overrides.MAILJET_SENDER_EMAIL ?? MAILJET_SENDER_EMAIL;
  process.env.MAILJET_SENDER_NAME =
    overrides.MAILJET_SENDER_NAME ?? MAILJET_SENDER_NAME;
}

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
  setMailjetEnv();
  setEmailProviderForTesting(null);
});

afterEach(() => {
  restoreEnv();
  setEmailProviderForTesting(null);
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("Mailjet provider", () => {
  it("sends a message with Basic auth and the v3.1 payload", async () => {
    const fetchMock = vi.fn().mockResolvedValue(successResponse());
    const provider = new MailjetEmailProvider(fetchMock);

    expect(provider.isConfigured).toBe(true);

    const result = await provider.send({
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

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.mailjet.com/v3.1/send");
    expect(init).toMatchObject({
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(
          `${MAILJET_API_KEY}:${MAILJET_API_SECRET}`,
        ).toString("base64")}`,
        "Content-Type": "application/json",
      },
    });

    const body = JSON.parse(String(init.body));
    expect(body).toEqual({
      Messages: [
        {
          From: { Email: MAILJET_SENDER_EMAIL, Name: MAILJET_SENDER_NAME },
          To: [{ Email: RECIPIENT }],
          Subject: "RAMS test",
          TextPart: "Hello",
          HTMLPart: "<p>Hello</p>",
        },
      ],
    });
  });

  it("omits HTMLPart when no HTML body is provided", async () => {
    const fetchMock = vi.fn().mockResolvedValue(successResponse());
    const provider = new MailjetEmailProvider(fetchMock);

    await provider.send({
      to: RECIPIENT,
      subject: "RAMS test",
      text: "Hello",
    });

    const body = JSON.parse(String(fetchMock.mock.calls[0][1].body));
    expect(body.Messages[0]).not.toHaveProperty("HTMLPart");
  });

  it("returns not_configured without calling fetch when credentials are missing", async () => {
    delete process.env.MAILJET_API_SECRET;
    const fetchMock = vi.fn();
    const provider = new MailjetEmailProvider(fetchMock);

    expect(provider.isConfigured).toBe(false);

    const result = await provider.send({
      to: RECIPIENT,
      subject: "RAMS test",
      text: "Hello",
    });

    expect(result).toMatchObject({
      sent: false,
      status: "not_configured",
      provider: "mailjet",
      reason: "not_configured",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns not_configured when the sender email is invalid", () => {
    setMailjetEnv({ MAILJET_SENDER_EMAIL: "not-an-email" });
    const provider = new MailjetEmailProvider(vi.fn());

    expect(provider.isConfigured).toBe(false);
  });

  it("maps HTTP 401 to authentication_failed without logging secrets", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          ErrorMessage: `invalid credentials ${MAILJET_API_SECRET}`,
          ErrorCode: "mj-0002",
        }),
        { status: 401, headers: { "Content-Type": "application/json" } },
      ),
    );
    const provider = new MailjetEmailProvider(fetchMock);

    const result = await provider.send({
      to: RECIPIENT,
      subject: "RAMS test",
      text: "Hello",
    });

    expect(result).toMatchObject({
      sent: false,
      status: "failed",
      provider: "mailjet",
      httpStatus: 401,
      reason: "authentication_failed",
    });

    const serialized = JSON.stringify(errorSpy.mock.calls);
    expect(serialized).not.toContain(MAILJET_API_KEY);
    expect(serialized).not.toContain(MAILJET_API_SECRET);
    expect(serialized).not.toContain(RECIPIENT);
  });

  it("maps an HTTP 500 to provider_error", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response("upstream failure", { status: 500 }));
    const provider = new MailjetEmailProvider(fetchMock);

    const result = await provider.send({
      to: RECIPIENT,
      subject: "RAMS test",
      text: "Hello",
    });

    expect(result).toMatchObject({
      sent: false,
      status: "failed",
      provider: "mailjet",
      httpStatus: 500,
      reason: "provider_error",
    });
  });

  it("maps an aborted request to timeout", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const fetchMock = vi.fn().mockRejectedValue(
      Object.assign(new Error("The operation was aborted"), {
        name: "TimeoutError",
      }),
    );
    const provider = new MailjetEmailProvider(fetchMock);

    const result = await provider.send({
      to: RECIPIENT,
      subject: "RAMS test",
      text: "Hello",
    });

    expect(result).toMatchObject({
      sent: false,
      status: "failed",
      provider: "mailjet",
      reason: "timeout",
    });
  });

  it("maps a network failure to connection_failed", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const fetchMock = vi
      .fn()
      .mockRejectedValue(new Error("getaddrinfo ENOTFOUND"));
    const provider = new MailjetEmailProvider(fetchMock);

    const result = await provider.send({
      to: RECIPIENT,
      subject: "RAMS test",
      text: "Hello",
    });

    expect(result).toMatchObject({
      sent: false,
      status: "failed",
      provider: "mailjet",
      reason: "connection_failed",
    });
  });

  it("maps malformed JSON to invalid_response", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response("not json", { status: 200 }));
    const provider = new MailjetEmailProvider(fetchMock);

    const result = await provider.send({
      to: RECIPIENT,
      subject: "RAMS test",
      text: "Hello",
    });

    expect(result).toMatchObject({
      sent: false,
      status: "failed",
      provider: "mailjet",
      httpStatus: 200,
      reason: "invalid_response",
    });
  });

  it("maps a response without Messages to invalid_response", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ Messages: "unexpected" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    const provider = new MailjetEmailProvider(fetchMock);

    const result = await provider.send({
      to: RECIPIENT,
      subject: "RAMS test",
      text: "Hello",
    });

    expect(result).toMatchObject({
      sent: false,
      status: "failed",
      provider: "mailjet",
      reason: "invalid_response",
    });
  });

  it("maps a per-message error status to provider_error", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          Messages: [
            {
              Status: "error",
              Errors: [{ ErrorCode: "mj-0004", ErrorMessage: "rejected" }],
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    const provider = new MailjetEmailProvider(fetchMock);

    const result = await provider.send({
      to: RECIPIENT,
      subject: "RAMS test",
      text: "Hello",
    });

    expect(result).toMatchObject({
      sent: false,
      status: "failed",
      provider: "mailjet",
      reason: "provider_error",
    });
  });
});

describe("Mailjet provider selection", () => {
  it("is selected by EMAIL_PROVIDER=mailjet via sendEmail", async () => {
    setMailjetEnv();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(successResponse()));

    const result = await sendEmail({
      to: RECIPIENT,
      subject: "RAMS test",
      text: "Hello",
    });

    expect(result).toMatchObject({
      sent: true,
      status: "accepted",
      provider: "mailjet",
      providerMessageId: "mailjet-message-id",
    });
  });
});
