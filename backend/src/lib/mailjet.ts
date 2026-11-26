// Generic Mailjet transport. Mailjet is reserved for the H-24h meeting
// reminder engine; password reset and lecturer onboarding do not send email.
const MAILJET_SEND_ENDPOINT = "https://api.mailjet.com/v3.1/send";
const MAILJET_TIMEOUT_MS = 8000;
const EMAIL_PATTERN = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;
const DEFAULT_SENDER_NAME = "RAMS Platform";

export type EmailFailureReason =
  | "not_configured"
  | "provider_error"
  | "authentication_failed"
  | "connection_failed"
  | "envelope_rejected"
  | "timeout"
  | "invalid_response";

export type EmailAcceptanceStatus = "accepted" | "failed" | "not_configured";

export interface EmailSendResult {
  sent: boolean;
  status: EmailAcceptanceStatus;
  provider: string;
  providerMessageId?: string;
  httpStatus?: number;
  reason?: EmailFailureReason;
}

export interface TransactionalEmail {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export interface MailjetDiagnostics {
  provider: "mailjet";
  emailDeliveryConfigured: boolean;
  mailjetConfigured: boolean;
  mailjetApiKeyConfigured: boolean;
  mailjetSecretKeyConfigured: boolean;
  mailjetSenderEmailConfigured: boolean;
  mailjetSenderDomain: string | null;
  mailjetSenderNameConfigured: boolean;
  dryRun: boolean;
}

interface MailjetConfiguration {
  apiKey?: string;
  secretKey?: string;
  senderEmail?: string;
  senderName: string;
}

let transportOverride: typeof fetch | null = null;

/**
 * Test-only transport injection. A supplied transport bypasses the dry-run
 * gate so unit tests can inspect the exact Mailjet payload without network
 * access.
 */
export function setMailjetTransportForTesting(impl: typeof fetch | null) {
  transportOverride = impl;
}

function readConfiguration(): MailjetConfiguration {
  const apiKey = process.env.MAILJET_API_KEY?.trim();
  const secretKey =
    process.env.MAILJET_SECRET_KEY?.trim() ||
    process.env.MAILJET_API_SECRET?.trim();
  const senderEmail = process.env.MAILJET_SENDER_EMAIL?.trim();
  const senderName =
    process.env.MAILJET_SENDER_NAME?.replace(/[\r\n]+/g, " ")
      .replace(/\s+/g, " ")
      .trim() || DEFAULT_SENDER_NAME;

  return { apiKey, secretKey, senderEmail, senderName };
}

function isConfigured(config: MailjetConfiguration) {
  return Boolean(
    config.apiKey &&
      config.secretKey &&
      config.senderEmail &&
      EMAIL_PATTERN.test(config.senderEmail),
  );
}

export function isMailjetConfigured(): boolean {
  return isConfigured(readConfiguration());
}

export function isMailjetDryRun(): boolean {
  return (
    process.env.NODE_ENV === "test" ||
    process.env.MAILJET_DRY_RUN?.trim().toLowerCase() === "true"
  );
}

export function getMailjetConfigurationDiagnostics(): MailjetDiagnostics {
  const config = readConfiguration();
  return {
    provider: "mailjet",
    emailDeliveryConfigured: isConfigured(config),
    mailjetConfigured: isConfigured(config),
    mailjetApiKeyConfigured: Boolean(config.apiKey),
    mailjetSecretKeyConfigured: Boolean(config.secretKey),
    mailjetSenderEmailConfigured: Boolean(config.senderEmail),
    mailjetSenderDomain: config.senderEmail?.match(/@([^>\s]+)$/)?.[1] ?? null,
    mailjetSenderNameConfigured: Boolean(
      process.env.MAILJET_SENDER_NAME?.trim(),
    ),
    dryRun: isMailjetDryRun(),
  };
}

function failureReasonForStatus(httpStatus: number): EmailFailureReason {
  if (httpStatus === 401 || httpStatus === 403) return "authentication_failed";
  if (httpStatus === 408 || httpStatus === 504) return "timeout";
  return "provider_error";
}

function isTimeoutError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    ((error as { name?: unknown }).name === "TimeoutError" ||
      (error as { name?: unknown }).name === "AbortError")
  );
}

export async function sendEmail(
  message: TransactionalEmail,
): Promise<EmailSendResult> {
  const config = readConfiguration();
  if (!isConfigured(config)) {
    return {
      sent: false,
      status: "not_configured",
      provider: "mailjet",
      reason: "not_configured",
    };
  }
  if (!EMAIL_PATTERN.test(message.to)) {
    return {
      sent: false,
      status: "failed",
      provider: "mailjet",
      reason: "envelope_rejected",
    };
  }

  if (!transportOverride && isMailjetDryRun()) {
    console.info("Mailjet dry run: message not sent", {
      recipients: [message.to],
      subject: message.subject,
    });
    return { sent: true, status: "accepted", provider: "mailjet" };
  }

  const authorization = `Basic ${Buffer.from(
    `${config.apiKey}:${config.secretKey}`,
  ).toString("base64")}`;

  let response: Response;
  try {
    response = await (transportOverride ?? fetch)(MAILJET_SEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: authorization,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        Messages: [
          {
            From: { Email: config.senderEmail, Name: config.senderName },
            To: [{ Email: message.to }],
            Subject: message.subject,
            TextPart: message.text,
            ...(message.html ? { HTMLPart: message.html } : {}),
          },
        ],
      }),
      signal: AbortSignal.timeout(MAILJET_TIMEOUT_MS),
    });
  } catch (error) {
    const reason = isTimeoutError(error) ? "timeout" : "connection_failed";
    console.error("Mailjet send failed", {
      provider: "mailjet",
      status: "failed",
      reason,
    });
    return { sent: false, status: "failed", provider: "mailjet", reason };
  }

  if (!response.ok) {
    const reason = failureReasonForStatus(response.status);
    console.error("Mailjet rejected a message", {
      provider: "mailjet",
      status: "failed",
      reason,
      httpStatus: response.status,
    });
    return {
      sent: false,
      status: "failed",
      provider: "mailjet",
      httpStatus: response.status,
      reason,
    };
  }

  const body = (await response.json().catch(() => null)) as {
    Messages?: Array<{
      Status?: unknown;
      To?: Array<{ MessageID?: unknown; MessageUUID?: unknown }>;
    }>;
  } | null;
  const result = body?.Messages?.[0];
  if (!result || result.Status !== "success") {
    console.error("Mailjet returned an unexpected response", {
      provider: "mailjet",
      status: "failed",
      reason: "invalid_response",
      httpStatus: response.status,
    });
    return {
      sent: false,
      status: "failed",
      provider: "mailjet",
      httpStatus: response.status,
      reason: "invalid_response",
    };
  }

  const recipient = result.To?.[0];
  const providerMessageId =
    typeof recipient?.MessageID === "string" && recipient.MessageID
      ? recipient.MessageID
      : typeof recipient?.MessageUUID === "string" && recipient.MessageUUID
        ? recipient.MessageUUID
        : undefined;

  return {
    sent: true,
    status: "accepted",
    provider: "mailjet",
    ...(providerMessageId ? { providerMessageId } : {}),
  };
}
