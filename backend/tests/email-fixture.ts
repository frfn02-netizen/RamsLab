import { setMailjetTransportForTesting } from "../src/lib/mailjet.js";

export interface CapturedEmail {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

const MAILJET_ENV = {
  MAILJET_API_KEY: "test-mailjet-key",
  MAILJET_SECRET_KEY: "test-mailjet-secret",
  MAILJET_SENDER_EMAIL: "no-reply@rams.test",
  MAILJET_SENDER_NAME: "RAMS Platform",
} as const;

let savedEnv: Record<string, string | undefined> | null = null;

function configureMailjet() {
  if (savedEnv) return;
  savedEnv = {};
  for (const [key, value] of Object.entries(MAILJET_ENV)) {
    savedEnv[key] = process.env[key];
    process.env[key] = value;
  }
  delete process.env.MAILJET_API_SECRET;
}

function restoreMailjetEnv() {
  if (!savedEnv) return;
  for (const [key, value] of Object.entries(savedEnv)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  savedEnv = null;
}

function capture(init: RequestInit | undefined): CapturedEmail {
  const payload = JSON.parse(String(init?.body ?? "{}")) as {
    Messages?: Array<{
      To?: Array<{ Email?: string }>;
      Subject?: string;
      TextPart?: string;
      HTMLPart?: string;
    }>;
  };
  const message = payload.Messages?.[0];
  return {
    to: message?.To?.[0]?.Email ?? "",
    subject: message?.Subject ?? "",
    text: message?.TextPart ?? "",
    ...(message?.HTMLPart ? { html: message.HTMLPart } : {}),
  };
}

export class TestEmailProvider {
  readonly name = "mailjet";
  readonly isConfigured = true;
  readonly messages: CapturedEmail[] = [];
}

export class FailingEmailProvider {
  readonly name = "mailjet";
  readonly isConfigured = true;
  readonly messages: CapturedEmail[] = [];
}

export function useTestEmailProvider() {
  configureMailjet();
  const provider = new TestEmailProvider();
  setMailjetTransportForTesting(async (_url, init) => {
    provider.messages.push(capture(init));
    return new Response(
      JSON.stringify({
        Messages: [
          {
            Status: "success",
            To: [{ MessageID: "test-message-id" }],
          },
        ],
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  });
  return provider;
}

export function useFailingEmailProvider() {
  configureMailjet();
  setMailjetTransportForTesting(
    async () => new Response("provider error", { status: 500 }),
  );
}

export function clearTestEmailProvider() {
  setMailjetTransportForTesting(null);
  restoreMailjetEnv();
}

export function extractResetToken(text: string): string | null {
  const match = text.match(/reset-password[?#]token=([A-Za-z0-9_-]+)/);
  return match?.[1] ?? null;
}
