import {
  setEmailProviderForTesting,
  type EmailMessage,
  type EmailProvider,
  type EmailSendResult,
} from "../src/lib/email.js";

export class TestEmailProvider implements EmailProvider {
  readonly name = "test";
  readonly isConfigured = true;
  readonly messages: EmailMessage[] = [];

  async send(message: EmailMessage): Promise<EmailSendResult> {
    this.messages.push(message);
    return {
      sent: true,
      status: "accepted",
      provider: this.name,
      providerMessageId: "test-message-id",
    };
  }
}

export class FailingEmailProvider implements EmailProvider {
  readonly name = "failing";
  readonly isConfigured = true;

  async send(): Promise<EmailSendResult> {
    return {
      sent: false,
      status: "failed",
      provider: this.name,
      httpStatus: 500,
      reason: "provider_error",
    };
  }
}

export function useTestEmailProvider() {
  const provider = new TestEmailProvider();
  setEmailProviderForTesting(provider);
  return provider;
}

export function useFailingEmailProvider() {
  setEmailProviderForTesting(new FailingEmailProvider());
}

export function clearTestEmailProvider() {
  setEmailProviderForTesting(null);
}

export function extractResetToken(text: string): string | null {
  const match = text.match(/reset-password[?#]token=([A-Za-z0-9_-]+)/);
  return match?.[1] ?? null;
}
