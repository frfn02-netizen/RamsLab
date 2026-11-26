// Server-only mailer. The backend has no client runtime, so the Next.js
// `server-only` marker package is intentionally not used here.
import type { Meeting } from "../modules/meetings/meeting.types.js";

const MAILJET_SEND_ENDPOINT = "https://api.mailjet.com/v3.1/send";
const MAILJET_TIMEOUT_MS = 8000;
const TIME_ZONE = "Asia/Jakarta";
const EMAIL_PATTERN = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;
const DEFAULT_SENDER_NAME = "RAMS Platform";
const DEFAULT_APP_ORIGIN = "http://localhost:3000";

export type MeetingEmailKind = "created" | "reminder";

export interface MeetingEmailRecipient {
  email: string;
  name?: string;
}

export interface MeetingEmailOptions {
  recipient: MeetingEmailRecipient;
  meeting: Pick<
    Meeting,
    "title" | "startAt" | "endAt" | "location" | "meetingLink"
  >;
  organizerName: string;
  kind: MeetingEmailKind;
  locale?: "en" | "id";
}

export interface MeetingEmailResult {
  success: boolean;
  error?: string;
}

export interface LecturerOnboardingEmailOptions {
  recipient: MeetingEmailRecipient;
  fullName: string;
  email: string;
  /** Present only when the backend generated the initial password. */
  temporaryPassword?: string;
  /** Overrides the FRONTEND_URL-derived login URL. */
  loginUrl?: string;
}

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

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[character] ?? character,
  );
}

function formatMeetingTime(date: Date, locale: "en" | "id") {
  return new Intl.DateTimeFormat(locale === "id" ? "id-ID" : "en-GB", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: TIME_ZONE,
  }).format(date);
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

function renderMessage(options: MeetingEmailOptions) {
  const locale = options.locale ?? "id";
  const isReminder = options.kind === "reminder";
  const title = isReminder
    ? `Reminder: ${options.meeting.title}`
    : `New RAMS meeting: ${options.meeting.title}`;
  const start = formatMeetingTime(options.meeting.startAt, locale);
  const end = formatMeetingTime(options.meeting.endAt, locale);
  const location = options.meeting.location?.trim() || "Online meeting";
  const link = options.meeting.meetingLink?.trim();
  const greeting = options.recipient.name?.trim()
    ? `Hello ${options.recipient.name.trim()},`
    : "Hello,";
  const intro = isReminder
    ? `This is a reminder for the RAMS meeting "${options.meeting.title}".`
    : `A new RAMS meeting, "${options.meeting.title}", has been scheduled.`;
  const text = [
    greeting,
    "",
    intro,
    `Time: ${start} to ${end} WIB`,
    `Location: ${location}`,
    ...(link ? [`Meeting link: ${link}`] : []),
    `Organizer: ${options.organizerName}`,
    "",
    "RAMS Platform",
  ].join("\n");
  const html = `<!doctype html><html><body style="font-family:Arial,sans-serif;line-height:1.5;color:#242424"><p>${escapeHtml(greeting)}</p><p>${escapeHtml(intro)}</p><table role="presentation" style="border-collapse:collapse"><tr><td style="padding:4px 16px 4px 0"><strong>Title</strong></td><td style="padding:4px 0">${escapeHtml(options.meeting.title)}</td></tr><tr><td style="padding:4px 16px 4px 0"><strong>Time</strong></td><td style="padding:4px 0">${escapeHtml(start)} to ${escapeHtml(end)} WIB</td></tr><tr><td style="padding:4px 16px 4px 0"><strong>Location</strong></td><td style="padding:4px 0">${escapeHtml(location)}</td></tr><tr><td style="padding:4px 16px 4px 0"><strong>Organizer</strong></td><td style="padding:4px 0">${escapeHtml(options.organizerName)}</td></tr>${link ? `<tr><td style="padding:4px 16px 4px 0"><strong>Meeting link</strong></td><td style="padding:4px 0"><a href="${escapeHtml(link)}">${escapeHtml(link)}</a></td></tr>` : ""}</table><p>RAMS Platform</p></body></html>`;

  return { subject: title, text, html };
}

function loginUrlFromEnvironment() {
  const configured = process.env.FRONTEND_URL?.split(",")[0]?.trim();
  const origin = configured || DEFAULT_APP_ORIGIN;
  return `${origin.replace(/\/+$/, "")}/login`;
}

function renderOnboardingMessage(
  options: LecturerOnboardingEmailOptions,
  loginUrl: string,
) {
  const subject = "Your RAMS lecturer account";
  const passwordLine = options.temporaryPassword
    ? `Temporary password: ${options.temporaryPassword}`
    : "Initial password: use the password provided by the RAMS administrator.";
  const text = [
    `Hello ${options.fullName},`,
    "",
    "An administrator created a RAMS lecturer account for you.",
    "",
    `Login page: ${loginUrl}`,
    `Email: ${options.email}`,
    passwordLine,
    "",
    "Change the password the first time you sign in. You will be asked to set a new password before you can open the meetings workspace.",
    "",
    "If you were not expecting this account, contact the RAMS administrator.",
    "",
    "RAMS Platform",
  ].join("\n");
  const html = `<!doctype html><html><body style="font-family:Arial,sans-serif;line-height:1.5;color:#242424"><p>${escapeHtml(`Hello ${options.fullName},`)}</p><p>An administrator created a RAMS lecturer account for you.</p><table role="presentation" style="border-collapse:collapse"><tr><td style="padding:4px 16px 4px 0"><strong>Login page</strong></td><td style="padding:4px 0"><a href="${escapeHtml(loginUrl)}">${escapeHtml(loginUrl)}</a></td></tr><tr><td style="padding:4px 16px 4px 0"><strong>Email</strong></td><td style="padding:4px 0">${escapeHtml(options.email)}</td></tr><tr><td style="padding:4px 16px 4px 0"><strong>${options.temporaryPassword ? "Temporary password" : "Initial password"}</strong></td><td style="padding:4px 0">${escapeHtml(options.temporaryPassword ?? "Use the password provided by the RAMS administrator.")}</td></tr></table><p>Change the password the first time you sign in. You will be asked to set a new password before you can open the meetings workspace.</p><p>If you were not expecting this account, contact the RAMS administrator.</p><p>RAMS Platform</p></body></html>`;

  return { subject, text, html };
}

function renderPasswordResetMessage(resetUrl: string) {
  return {
    subject: "Reset your RAMS password",
    text: [
      "Use this link to reset your RAMS password:",
      "",
      resetUrl,
      "",
      "This link expires soon and can be used only once. If you did not request a password reset, you can ignore this email.",
      "",
      "RAMS Platform",
    ].join("\n"),
    html: `<!doctype html><html><body style="font-family:Arial,sans-serif;line-height:1.5;color:#242424"><p>Use this link to reset your RAMS password:</p><p><a href="${escapeHtml(resetUrl)}">${escapeHtml(resetUrl)}</a></p><p>This link expires soon and can be used only once. If you did not request a password reset, you can ignore this email.</p><p>RAMS Platform</p></body></html>`,
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

export async function sendMeetingEmail(
  options: MeetingEmailOptions,
): Promise<MeetingEmailResult> {
  if (!EMAIL_PATTERN.test(options.recipient.email)) {
    return { success: false, error: "invalid_recipient_email" };
  }

  const rendered = renderMessage(options);
  const result = await sendEmail({
    to: options.recipient.email,
    subject: rendered.subject,
    text: rendered.text,
    html: rendered.html,
  });

  return result.sent
    ? { success: true }
    : { success: false, error: result.reason ?? "mailjet_request_failed" };
}

export async function sendLecturerOnboardingEmail(
  options: LecturerOnboardingEmailOptions,
): Promise<MeetingEmailResult> {
  const loginUrl = options.loginUrl?.trim() || loginUrlFromEnvironment();
  const rendered = renderOnboardingMessage(options, loginUrl);
  const result = await sendEmail({
    to: options.recipient.email,
    subject: rendered.subject,
    text: rendered.text,
    html: rendered.html,
  });

  return result.sent
    ? { success: true }
    : { success: false, error: result.reason ?? "mailjet_request_failed" };
}

export async function sendPasswordResetEmail(
  to: string,
  resetUrl: string,
): Promise<EmailSendResult> {
  const rendered = renderPasswordResetMessage(resetUrl);
  return sendEmail({
    to,
    subject: rendered.subject,
    text: rendered.text,
    html: rendered.html,
  });
}
