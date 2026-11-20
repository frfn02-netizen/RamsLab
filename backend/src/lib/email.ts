import nodemailer from "nodemailer";

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export type EmailFailureReason =
  | "not_configured"
  | "provider_error"
  | "authentication_failed"
  | "connection_failed"
  | "envelope_rejected"
  | "timeout"
  | "invalid_response";

// "accepted" means the provider accepted the send request. Delivered, bounced,
// and failed are provider-asynchronous delivery states and are not returned by
// the send API. Check the provider dashboard or webhooks for those states.
export type EmailAcceptanceStatus = "accepted" | "failed" | "not_configured";

export interface EmailSendResult {
  sent: boolean;
  status: EmailAcceptanceStatus;
  provider: string;
  providerMessageId?: string;
  httpStatus?: number;
  reason?: EmailFailureReason;
}

export interface EmailProvider {
  readonly name: string;
  readonly isConfigured: boolean;
  send(message: EmailMessage): Promise<EmailSendResult>;
}

export interface EmailConfigurationDiagnostics {
  provider: string;
  resendApiKeyConfigured: boolean;
  emailFromConfigured: boolean;
  emailFromDomain: string | null;
  gmailSmtpConfigured: boolean;
  gmailSmtpHost: string;
  gmailSmtpPort: number;
  gmailSmtpUserConfigured: boolean;
  gmailAppPasswordConfigured: boolean;
  gmailFromCompatible: boolean;
  mailjetConfigured: boolean;
  mailjetApiKeyConfigured: boolean;
  mailjetApiSecretConfigured: boolean;
  mailjetSenderEmailConfigured: boolean;
  mailjetSenderDomain: string | null;
  mailjetSenderNameConfigured: boolean;
}

interface GmailConfiguration {
  host: string;
  port: number;
  user?: string;
  appPassword?: string;
  from: string;
  fromAddress: string | null;
  fromCompatible: boolean;
  configured: boolean;
}

export interface GmailTransport {
  sendMail(message: {
    from: string;
    to: string;
    subject: string;
    text: string;
    html?: string;
  }): Promise<{ messageId?: string; response?: string }>;
}

function extractEmailAddress(value: string): string | null {
  const match = value.match(/<([^>]+)>/);
  const candidate = (match?.[1] ?? value).trim();
  return /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(candidate) ? candidate : null;
}

function readGmailConfiguration(): GmailConfiguration {
  const host =
    process.env.GMAIL_SMTP_HOST?.trim() || "smtp.gmail.com";
  const rawPort = Number(process.env.GMAIL_SMTP_PORT ?? 587);
  const port =
    Number.isInteger(rawPort) && rawPort > 0 && rawPort <= 65535
      ? rawPort
      : 0;
  const user = process.env.GMAIL_SMTP_USER?.trim() || undefined;
  const appPassword =
    process.env.GMAIL_SMTP_APP_PASSWORD?.replace(/\s+/g, "") || undefined;
  const from = process.env.EMAIL_FROM?.trim() || user || "";
  const fromAddress = from ? extractEmailAddress(from) : null;
  const fromCompatible = Boolean(
    user && fromAddress && fromAddress.toLowerCase() === user.toLowerCase(),
  );
  const configured = Boolean(
    host && port > 0 && user && appPassword && fromCompatible,
  );

  return {
    host,
    port,
    user,
    appPassword,
    from,
    fromAddress,
    fromCompatible,
    configured,
  };
}

function smtpFailureReason(code: string): EmailFailureReason {
  switch (code) {
    case "EAUTH":
      return "authentication_failed";
    case "ETIMEDOUT":
    case "ECONNECTION":
    case "ESOCKET":
    case "EDNS":
      return "connection_failed";
    case "EENVELOPE":
      return "envelope_rejected";
    default:
      return "provider_error";
  }
}

function errorCode(error: unknown): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as { code?: unknown }).code === "string"
  ) {
    return (error as { code: string }).code;
  }
  return "";
}

export class GmailSmtpEmailProvider implements EmailProvider {
  readonly name = "gmail";
  readonly isConfigured: boolean;
  private readonly config: GmailConfiguration;
  private readonly transportOverride?: GmailTransport;
  private transport?: GmailTransport;

  constructor(transport?: GmailTransport) {
    this.config = readGmailConfiguration();
    this.isConfigured = this.config.configured;
    this.transportOverride = transport;
  }

  private getTransport(): GmailTransport {
    if (this.transportOverride) return this.transportOverride;
    if (!this.transport) {
      this.transport = nodemailer.createTransport({
        host: this.config.host,
        port: this.config.port,
        secure: this.config.port === 465,
        requireTLS: this.config.port !== 465,
        auth: {
          user: this.config.user!,
          pass: this.config.appPassword!,
        },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 15000,
        tls: { minVersion: "TLSv1.2" },
      }) as GmailTransport;
    }
    return this.transport;
  }

  async send(message: EmailMessage): Promise<EmailSendResult> {
    if (!this.isConfigured) {
      return {
        sent: false,
        status: "not_configured",
        provider: this.name,
        reason: "not_configured",
      };
    }

    try {
      const info = await this.getTransport().sendMail({
        from: this.config.from,
        to: message.to,
        subject: message.subject,
        text: message.text,
        ...(message.html ? { html: message.html } : {}),
      });
      const providerMessageId =
        typeof info.messageId === "string" ? info.messageId : undefined;

      return {
        sent: true,
        status: "accepted",
        provider: this.name,
        providerMessageId,
      };
    } catch (error) {
      const code = errorCode(error);
      const reason = smtpFailureReason(code);
      // Never log the raw SMTP error. It can contain the recipient, the SMTP
      // username, or server diagnostics. The code and reason are enough.
      console.error("Gmail SMTP send failed", {
        provider: this.name,
        status: "failed",
        reason,
        code: code || null,
      });
      return {
        sent: false,
        status: "failed",
        provider: this.name,
        reason,
      };
    }
  }
}

class DisabledEmailProvider implements EmailProvider {
  readonly name = "disabled";
  readonly isConfigured = false;

  async send(): Promise<EmailSendResult> {
    return {
      sent: false,
      status: "not_configured",
      provider: this.name,
      reason: "not_configured",
    };
  }
}

class ResendEmailProvider implements EmailProvider {
  readonly name = "resend";
  private readonly apiKey: string | undefined;
  private readonly from: string | undefined;

  constructor() {
    this.apiKey = process.env.RESEND_API_KEY?.trim() || undefined;
    this.from = process.env.EMAIL_FROM?.trim() || undefined;
  }

  get isConfigured() {
    return Boolean(this.apiKey && this.from);
  }

  async send(message: EmailMessage): Promise<EmailSendResult> {
    if (!this.apiKey || !this.from) {
      return {
        sent: false,
        status: "not_configured",
        provider: this.name,
        reason: "not_configured",
      };
    }

    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: this.from,
          to: [message.to],
          subject: message.subject,
          text: message.text,
          ...(message.html ? { html: message.html } : {}),
        }),
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        // Never log the message body, recipient, or reset link. The HTTP
        // status is enough to identify an authentication, validation, or
        // domain-verification rejection in the provider dashboard.
        console.error("Email provider rejected a message", {
          provider: this.name,
          httpStatus: response.status,
          status: "failed",
        });
        return {
          sent: false,
          status: "failed",
          provider: this.name,
          httpStatus: response.status,
          reason: "provider_error",
        };
      }

      const body = (await response.json().catch(() => null)) as
        | { id?: unknown }
        | null;
      const providerMessageId =
        typeof body?.id === "string" ? body.id : undefined;

      return {
        sent: true,
        status: "accepted",
        provider: this.name,
        providerMessageId,
      };
    } catch (error) {
      console.error("Email provider request failed", {
        provider: this.name,
        status: "failed",
        error: error instanceof Error ? error.message : "unknown error",
      });
      return {
        sent: false,
        status: "failed",
        provider: this.name,
        reason: "provider_error",
      };
    }
  }
}

interface MailjetConfiguration {
  apiKey?: string;
  apiSecret?: string;
  senderEmail?: string;
  senderName: string;
  configured: boolean;
}

interface MailjetSendResponse {
  Messages?: Array<{
    Status?: unknown;
    To?: Array<{ MessageID?: unknown; MessageUUID?: unknown }>;
  }>;
}

const MAILJET_SEND_ENDPOINT = "https://api.mailjet.com/v3.1/send";
const DEFAULT_MAILJET_SENDER_NAME = "RAMS Platform";
const EMAIL_ADDRESS_PATTERN = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;

function sanitizeSenderName(value: string | undefined): string {
  const name = (value ?? "")
    .replace(/[\r\n]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 200);
  return name || DEFAULT_MAILJET_SENDER_NAME;
}

function readMailjetConfiguration(): MailjetConfiguration {
  const apiKey = process.env.MAILJET_API_KEY?.trim() || undefined;
  const apiSecret = process.env.MAILJET_API_SECRET?.trim() || undefined;
  const rawSenderEmail = process.env.MAILJET_SENDER_EMAIL?.trim() || undefined;
  const senderEmail =
    rawSenderEmail && EMAIL_ADDRESS_PATTERN.test(rawSenderEmail)
      ? rawSenderEmail
      : undefined;
  const senderName = sanitizeSenderName(process.env.MAILJET_SENDER_NAME);

  return {
    apiKey,
    apiSecret,
    senderEmail,
    senderName,
    configured: Boolean(apiKey && apiSecret && senderEmail),
  };
}

function mailjetHttpFailureReason(httpStatus: number): EmailFailureReason {
  if (httpStatus === 401 || httpStatus === 403) return "authentication_failed";
  if (httpStatus === 408 || httpStatus === 504) return "timeout";
  return "provider_error";
}

function isTimeoutError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    ((error as { name?: unknown }).name === "TimeoutError" ||
      (error as { name?: unknown }).name === "AbortError")
  );
}

function readMailjetMessageId(body: MailjetSendResponse): string | undefined {
  const recipient = body.Messages?.[0]?.To?.[0];
  if (typeof recipient?.MessageID === "string" && recipient.MessageID) {
    return recipient.MessageID;
  }
  if (typeof recipient?.MessageUUID === "string" && recipient.MessageUUID) {
    return recipient.MessageUUID;
  }
  return undefined;
}

export class MailjetEmailProvider implements EmailProvider {
  readonly name = "mailjet";
  readonly isConfigured: boolean;
  private readonly config: MailjetConfiguration;
  private readonly fetchOverride?: typeof fetch;

  constructor(fetchImpl?: typeof fetch) {
    this.config = readMailjetConfiguration();
    this.isConfigured = this.config.configured;
    this.fetchOverride = fetchImpl;
  }

  async send(message: EmailMessage): Promise<EmailSendResult> {
    if (!this.isConfigured || !this.config.apiKey || !this.config.apiSecret) {
      return {
        sent: false,
        status: "not_configured",
        provider: this.name,
        reason: "not_configured",
      };
    }

    const authorization = `Basic ${Buffer.from(
      `${this.config.apiKey}:${this.config.apiSecret}`,
    ).toString("base64")}`;

    let response: Response;
    try {
      response = await (this.fetchOverride ?? fetch)(MAILJET_SEND_ENDPOINT, {
        method: "POST",
        headers: {
          Authorization: authorization,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          Messages: [
            {
              From: {
                Email: this.config.senderEmail,
                Name: this.config.senderName,
              },
              To: [{ Email: message.to }],
              Subject: message.subject,
              TextPart: message.text,
              ...(message.html ? { HTMLPart: message.html } : {}),
            },
          ],
        }),
        signal: AbortSignal.timeout(10000),
      });
    } catch (error) {
      const reason = isTimeoutError(error) ? "timeout" : "connection_failed";
      // Never log the raw error. It may contain the request URL, headers, or
      // other transport details. The provider and reason are enough.
      console.error("Mailjet send failed", {
        provider: this.name,
        status: "failed",
        reason,
      });
      return {
        sent: false,
        status: "failed",
        provider: this.name,
        reason,
      };
    }

    if (!response.ok) {
      const reason = mailjetHttpFailureReason(response.status);
      // Never log the response body. Mailjet can echo the recipient or sender
      // in validation and authentication errors.
      console.error("Mailjet rejected a message", {
        provider: this.name,
        status: "failed",
        reason,
        httpStatus: response.status,
      });
      return {
        sent: false,
        status: "failed",
        provider: this.name,
        httpStatus: response.status,
        reason,
      };
    }

    let body: MailjetSendResponse | null;
    try {
      body = (await response.json()) as MailjetSendResponse;
    } catch {
      body = null;
    }

    const responseMessage = body?.Messages?.[0];
    if (
      !body ||
      !Array.isArray(body.Messages) ||
      body.Messages.length === 0 ||
      !responseMessage ||
      typeof responseMessage.Status !== "string"
    ) {
      console.error("Mailjet returned an unexpected response", {
        provider: this.name,
        status: "failed",
        reason: "invalid_response",
        httpStatus: response.status,
      });
      return {
        sent: false,
        status: "failed",
        provider: this.name,
        httpStatus: response.status,
        reason: "invalid_response",
      };
    }

    if (responseMessage.Status !== "success") {
      console.error("Mailjet rejected a message", {
        provider: this.name,
        status: "failed",
        reason: "provider_error",
        httpStatus: response.status,
      });
      return {
        sent: false,
        status: "failed",
        provider: this.name,
        httpStatus: response.status,
        reason: "provider_error",
      };
    }

    return {
      sent: true,
      status: "accepted",
      provider: this.name,
      providerMessageId: readMailjetMessageId(body),
    };
  }
}

const disabledProvider = new DisabledEmailProvider();
let providerOverride: EmailProvider | null = null;

export function setEmailProviderForTesting(provider: EmailProvider | null) {
  providerOverride = provider;
}

export function getEmailProvider(): EmailProvider {
  if (providerOverride) return providerOverride;

  const configured = (process.env.EMAIL_PROVIDER ?? "").trim().toLowerCase();
  if (configured === "gmail") return new GmailSmtpEmailProvider();
  if (configured === "resend") return new ResendEmailProvider();
  if (configured === "mailjet") return new MailjetEmailProvider();
  return disabledProvider;
}

export function isEmailConfigured() {
  return getEmailProvider().isConfigured;
}

export function getEmailConfigurationDiagnostics(): EmailConfigurationDiagnostics {
  const provider =
    (process.env.EMAIL_PROVIDER ?? "").trim().toLowerCase() || "unset";
  const gmail = readGmailConfiguration();
  const mailjet = readMailjetConfiguration();
  const from = process.env.EMAIL_FROM?.trim() || gmail.from;
  const domain = from?.match(/@([^>]+)/)?.[1] ?? null;
  const mailjetSenderDomain =
    mailjet.senderEmail?.match(/@([^>\s]+)$/)?.[1] ?? null;

  return {
    provider,
    resendApiKeyConfigured: Boolean(process.env.RESEND_API_KEY?.trim()),
    emailFromConfigured: Boolean(process.env.EMAIL_FROM?.trim()),
    emailFromDomain: domain,
    gmailSmtpConfigured: gmail.configured,
    gmailSmtpHost: gmail.host,
    gmailSmtpPort: gmail.port,
    gmailSmtpUserConfigured: Boolean(gmail.user),
    gmailAppPasswordConfigured: Boolean(gmail.appPassword),
    gmailFromCompatible: gmail.fromCompatible,
    mailjetConfigured: mailjet.configured,
    mailjetApiKeyConfigured: Boolean(mailjet.apiKey),
    mailjetApiSecretConfigured: Boolean(mailjet.apiSecret),
    mailjetSenderEmailConfigured: Boolean(mailjet.senderEmail),
    mailjetSenderDomain,
    mailjetSenderNameConfigured: Boolean(
      process.env.MAILJET_SENDER_NAME?.trim(),
    ),
  };
}

export async function sendEmail(
  message: EmailMessage,
): Promise<EmailSendResult> {
  const provider = getEmailProvider();
  if (!provider.isConfigured) {
    return {
      sent: false,
      status: "not_configured",
      provider: provider.name,
      reason: "not_configured",
    };
  }

  try {
    return await provider.send(message);
  } catch (error) {
    console.error("Email provider threw unexpectedly", {
      provider: provider.name,
      status: "failed",
      error: error instanceof Error ? error.message : "unknown error",
    });
    return {
      sent: false,
      status: "failed",
      provider: provider.name,
      reason: "provider_error",
    };
  }
}
