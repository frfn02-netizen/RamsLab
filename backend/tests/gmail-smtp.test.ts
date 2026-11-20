import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import request from "supertest";
import { ObjectId } from "mongodb";

import app from "../src/app.js";
import { connectDatabase } from "../src/config/database.js";
import { getUsersCollection } from "../src/modules/users/user.repository.js";
import { getPasswordResetTokensCollection } from "../src/modules/auth/password-reset.repository.js";
import {
  GmailSmtpEmailProvider,
  sendEmail,
  setEmailProviderForTesting,
  type GmailTransport,
} from "../src/lib/email.js";
import { ensurePasswordUser } from "./auth-fixture.js";

const USER_ID = "00000000000000000000f501";
const EMAIL = "vitest.gmail.smtp@test.local";
const PASSWORD = "gmail-smtp-pass-123";
const GMAIL_USER = "rams-test-sender@gmail.com";
const GMAIL_APP_PASSWORD = "abcdefghijklmnop";
const ENV_KEYS = [
  "EMAIL_PROVIDER",
  "EMAIL_FROM",
  "GMAIL_SMTP_HOST",
  "GMAIL_SMTP_PORT",
  "GMAIL_SMTP_USER",
  "GMAIL_SMTP_APP_PASSWORD",
  "RESEND_API_KEY",
] as const;

const originalEnv = Object.fromEntries(
  ENV_KEYS.map((key) => [key, process.env[key]]),
) as Record<(typeof ENV_KEYS)[number], string | undefined>;

function setGmailEnv(overrides: Partial<Record<string, string>> = {}) {
  process.env.EMAIL_PROVIDER = "gmail";
  process.env.EMAIL_FROM =
    overrides.EMAIL_FROM ?? `RAMS Platform <${GMAIL_USER}>`;
  process.env.GMAIL_SMTP_HOST =
    overrides.GMAIL_SMTP_HOST ?? "smtp.gmail.com";
  process.env.GMAIL_SMTP_PORT = overrides.GMAIL_SMTP_PORT ?? "587";
  process.env.GMAIL_SMTP_USER = overrides.GMAIL_SMTP_USER ?? GMAIL_USER;
  process.env.GMAIL_SMTP_APP_PASSWORD =
    overrides.GMAIL_SMTP_APP_PASSWORD ?? GMAIL_APP_PASSWORD;
}

function restoreEnv() {
  for (const key of ENV_KEYS) {
    const value = originalEnv[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

async function clearTokens() {
  await getPasswordResetTokensCollection().deleteMany({
    userId: new ObjectId(USER_ID),
  });
}

beforeAll(async () => {
  await connectDatabase();
  await ensurePasswordUser({
    id: USER_ID,
    email: EMAIL,
    password: PASSWORD,
    role: "ALUMNI",
    isActive: true,
    mustChangePassword: false,
  });
});

beforeEach(async () => {
  setGmailEnv();
  setEmailProviderForTesting(null);
  await clearTokens();
});

afterEach(() => {
  restoreEnv();
  setEmailProviderForTesting(null);
  vi.unstubAllGlobals();
});

afterAll(async () => {
  await getUsersCollection().deleteOne({ _id: new ObjectId(USER_ID) });
  await clearTokens();
  setEmailProviderForTesting(null);
});

describe("Gmail SMTP provider", () => {
  it("returns accepted with the SMTP message id", async () => {
    const sendMail = vi.fn().mockResolvedValue({
      messageId: "<smtp-message-id@test>",
    });
    const provider = new GmailSmtpEmailProvider({ sendMail });

    expect(provider.isConfigured).toBe(true);

    const result = await provider.send({
      to: "recipient@example.com",
      subject: "RAMS test",
      text: "Hello",
    });

    expect(result).toEqual({
      sent: true,
      status: "accepted",
      provider: "gmail",
      providerMessageId: "<smtp-message-id@test>",
    });
    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        from: `RAMS Platform <${GMAIL_USER}>`,
        to: "recipient@example.com",
        subject: "RAMS test",
        text: "Hello",
      }),
    );
  });

  it("maps SMTP authentication failure to a sanitized reason", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const transport: GmailTransport = {
      sendMail: vi
        .fn()
        .mockRejectedValue(
          Object.assign(new Error("Invalid login: 535-5.7.8"), {
            code: "EAUTH",
          }),
        ),
    };
    const provider = new GmailSmtpEmailProvider(transport);

    const result = await provider.send({
      to: "recipient@example.com",
      subject: "RAMS test",
      text: "Hello",
    });

    expect(result).toMatchObject({
      sent: false,
      status: "failed",
      provider: "gmail",
      reason: "authentication_failed",
    });
    const failureLog = errorSpy.mock.calls.find(
      ([message]) => message === "Gmail SMTP send failed",
    );
    expect(failureLog?.[1]).toMatchObject({
      provider: "gmail",
      status: "failed",
      reason: "authentication_failed",
      code: "EAUTH",
    });
    const serialized = JSON.stringify(failureLog);
    expect(serialized).not.toContain(GMAIL_APP_PASSWORD);
    expect(serialized).not.toContain(GMAIL_USER);
    expect(serialized).not.toContain("Invalid login");
  });

  it("maps connection timeout to a sanitized reason", async () => {
    const transport: GmailTransport = {
      sendMail: vi
        .fn()
        .mockRejectedValue(
          Object.assign(new Error("Connection timeout"), { code: "ETIMEDOUT" }),
        ),
    };
    const provider = new GmailSmtpEmailProvider(transport);

    const result = await provider.send({
      to: "recipient@example.com",
      subject: "RAMS test",
      text: "Hello",
    });

    expect(result).toMatchObject({
      sent: false,
      status: "failed",
      provider: "gmail",
      reason: "connection_failed",
    });
  });

  it("returns not_configured when Gmail credentials are missing", async () => {
    delete process.env.GMAIL_SMTP_APP_PASSWORD;
    const sendMail = vi.fn();
    const provider = new GmailSmtpEmailProvider({ sendMail });

    expect(provider.isConfigured).toBe(false);
    const result = await provider.send({
      to: "recipient@example.com",
      subject: "RAMS test",
      text: "Hello",
    });

    expect(result).toMatchObject({
      sent: false,
      status: "not_configured",
      provider: "gmail",
      reason: "not_configured",
    });
    expect(sendMail).not.toHaveBeenCalled();
  });

  it("rejects a sender address that differs from the SMTP user", async () => {
    setGmailEnv({ EMAIL_FROM: "RAMS Platform <someone-else@gmail.com>" });
    const provider = new GmailSmtpEmailProvider({ sendMail: vi.fn() });

    expect(provider.isConfigured).toBe(false);
  });
});

describe("Gmail SMTP integration", () => {
  it("keeps the generic response and deletes the token when SMTP fails", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const transport: GmailTransport = {
      sendMail: vi
        .fn()
        .mockRejectedValue(
          Object.assign(new Error("Invalid login"), { code: "EAUTH" }),
        ),
    };
    const provider = new GmailSmtpEmailProvider(transport);
    setEmailProviderForTesting(provider);

    const response = await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: EMAIL });

    expect(response.status).toBe(200);
    expect(response.body.message).toContain("If an account matches");

    expect(
      await getPasswordResetTokensCollection().countDocuments({
        userId: new ObjectId(USER_ID),
      }),
    ).toBe(0);

    const deliveryLog = errorSpy.mock.calls.find(
      ([message]) => message === "Password reset email delivery failed",
    );
    expect(deliveryLog?.[1]).toMatchObject({
      provider: "gmail",
      status: "failed",
      reason: "authentication_failed",
      userId: USER_ID,
    });
    const serialized = JSON.stringify(deliveryLog);
    expect(serialized).not.toContain(EMAIL);
    expect(serialized).not.toContain("token=");
    expect(serialized).not.toContain(GMAIL_APP_PASSWORD);
  });

  it("keeps the Resend provider functional", async () => {
    process.env.EMAIL_PROVIDER = "resend";
    process.env.RESEND_API_KEY = "test-resend-key";
    process.env.EMAIL_FROM = "RAMS Platform <no-reply@example.com>";
    setEmailProviderForTesting(null);

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: "resend-message-id" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await sendEmail({
      to: "recipient@example.com",
      subject: "RAMS test",
      text: "Hello",
    });

    expect(result).toMatchObject({
      sent: true,
      status: "accepted",
      provider: "resend",
      providerMessageId: "resend-message-id",
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.resend.com/emails",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer test-resend-key",
        }),
      }),
    );
  });
});
