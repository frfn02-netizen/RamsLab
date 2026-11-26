import {
  readMetaWhatsAppConfig,
  type MetaWhatsAppRuntimeConfig,
} from "../../../config/meta-whatsapp.js";
import { isValidE164 } from "../../../lib/phone.js";
import type {
  MeetingReminderFailureReason,
  ReminderFailureDisposition,
} from "../meeting-reminder.types.js";
import type {
  WhatsAppGatewayMessage,
  WhatsAppGatewayResult,
  WhatsAppGatewayTransport,
} from "./whatsapp.js";

type FetchLike = typeof fetch;

export const META_WHATSAPP_DEFAULT_TIMEOUT_MS = 10_000;

export type MetaWhatsAppTemplateField =
  "meetingTitle" | "dateTime" | "organizerName" | "meetingLink" | "detailUrl";

export interface MetaWhatsAppTemplateConfig {
  readonly name: string;
  readonly languageCode: string;
  readonly parameters: readonly MetaWhatsAppTemplateField[];
}

const META_WHATSAPP_TEMPLATE_FIELDS: readonly MetaWhatsAppTemplateField[] = [
  "meetingTitle",
  "dateTime",
  "organizerName",
  "meetingLink",
  "detailUrl",
];

const META_WHATSAPP_LANGUAGE_CODE_PATTERN = /^[a-z]{2}(?:_[A-Z]{2})?$/;

export const META_WHATSAPP_REMINDER_TEMPLATES = {
  1440: {
    name: "rams_meeting_reminder_24h",
    languageCode: "id",
    parameters: [
      "meetingTitle",
      "dateTime",
      "organizerName",
      "meetingLink",
      "detailUrl",
    ],
  },
  60: {
    name: "rams_meeting_reminder_1h",
    languageCode: "id",
    parameters: [
      "meetingTitle",
      "dateTime",
      "organizerName",
      "meetingLink",
      "detailUrl",
    ],
  },
} as const satisfies Record<1440 | 60, MetaWhatsAppTemplateConfig>;

export interface MetaWhatsAppCloudTransportOptions extends MetaWhatsAppRuntimeConfig {
  fetchImpl?: FetchLike;
  timeoutMs?: number;
}

interface MetaWhatsAppTemplateParameter {
  type: "text";
  text: string;
}

export interface MetaWhatsAppTemplatePayload {
  messaging_product: "whatsapp";
  to: string;
  type: "template";
  template: {
    name: string;
    language: { code: string };
    components: Array<{
      type: "body";
      parameters: MetaWhatsAppTemplateParameter[];
    }>;
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isTimeoutError(error: unknown): boolean {
  if (typeof error !== "object" || error === null || !("name" in error)) {
    return false;
  }
  const name = (error as { name?: unknown }).name;
  return name === "TimeoutError" || name === "AbortError";
}

function singleLine(value: string, fallback: string): string {
  const text = value.replace(/\s+/g, " ").trim();
  return (text || fallback).slice(0, 1_024);
}

function formatIndonesianDateTime(value: Date, timezone: string): string {
  const formatted = new Intl.DateTimeFormat("id-ID", {
    timeZone: timezone,
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(value);

  return `${formatted} (${timezone})`;
}

function templateForInterval(
  intervalMinutes: number,
): MetaWhatsAppTemplateConfig | null {
  if (intervalMinutes === 1440) return META_WHATSAPP_REMINDER_TEMPLATES[1440];
  if (intervalMinutes === 60) return META_WHATSAPP_REMINDER_TEMPLATES[60];
  return null;
}

export function isMetaWhatsAppTemplateConfigValid(
  template: MetaWhatsAppTemplateConfig,
): boolean {
  if (!template.name.trim()) return false;
  if (!META_WHATSAPP_LANGUAGE_CODE_PATTERN.test(template.languageCode)) {
    return false;
  }
  if (template.parameters.length === 0) return false;

  const seen = new Set<string>();
  for (const field of template.parameters) {
    if (!META_WHATSAPP_TEMPLATE_FIELDS.includes(field)) return false;
    if (seen.has(field)) return false;
    seen.add(field);
  }

  return true;
}

function templateFieldValue(
  message: WhatsAppGatewayMessage,
  field: MetaWhatsAppTemplateField,
): string {
  switch (field) {
    case "meetingTitle":
      return singleLine(message.meetingTitle, "Rapat RAMS");
    case "dateTime":
      return formatIndonesianDateTime(message.startAt, message.timezone);
    case "organizerName":
      return singleLine(message.organizerName, "RAMS");
    case "meetingLink":
      return message.meetingLink ?? "Tidak tersedia";
    case "detailUrl":
      return message.detailUrl ?? "Tidak tersedia";
  }
}

export function buildMetaWhatsAppTemplatePayloadForTemplate(
  message: WhatsAppGatewayMessage,
  template: MetaWhatsAppTemplateConfig,
): MetaWhatsAppTemplatePayload | null {
  if (!isMetaWhatsAppTemplateConfigValid(template)) return null;

  return {
    messaging_product: "whatsapp",
    to: message.to.replace(/^\+/, ""),
    type: "template",
    template: {
      name: template.name,
      language: { code: template.languageCode },
      components: [
        {
          type: "body",
          parameters: template.parameters.map((field) => ({
            type: "text" as const,
            text: templateFieldValue(message, field),
          })),
        },
      ],
    },
  };
}

export function buildMetaWhatsAppTemplatePayload(
  message: WhatsAppGatewayMessage,
): MetaWhatsAppTemplatePayload | null {
  const template = templateForInterval(message.intervalMinutes);
  if (!template) return null;
  return buildMetaWhatsAppTemplatePayloadForTemplate(message, template);
}

function httpFailure(status: number): {
  disposition: ReminderFailureDisposition;
  reason: MeetingReminderFailureReason;
} {
  if (status === 401 || status === 403) {
    return { disposition: "rejected", reason: "authentication_failed" };
  }
  if (status === 429) {
    return { disposition: "retryable", reason: "provider_error" };
  }
  if ([400, 404, 409, 413, 422].includes(status)) {
    return { disposition: "rejected", reason: "provider_error" };
  }
  return { disposition: "ambiguous", reason: "provider_error" };
}

function providerMessageId(body: unknown): string | undefined {
  if (!isRecord(body) || !Array.isArray(body.messages)) return undefined;
  const firstMessage = body.messages[0];
  if (!isRecord(firstMessage) || typeof firstMessage.id !== "string") {
    return undefined;
  }
  const id = firstMessage.id.trim();
  return id || undefined;
}

export class MetaWhatsAppCloudTransport implements WhatsAppGatewayTransport {
  readonly name = "meta-whatsapp-cloud";
  private readonly accessToken: string | null;
  private readonly phoneNumberId: string | null;
  private readonly graphApiVersion: string;
  private readonly timeoutMs: number;
  private readonly fetchImpl: FetchLike;

  constructor(options: MetaWhatsAppCloudTransportOptions) {
    this.accessToken = options.accessToken;
    this.phoneNumberId = options.phoneNumberId;
    this.graphApiVersion = options.graphApiVersion;
    this.timeoutMs = options.timeoutMs ?? META_WHATSAPP_DEFAULT_TIMEOUT_MS;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  get isConfigured(): boolean {
    return Boolean(this.accessToken && this.phoneNumberId);
  }

  private endpoint(): string | null {
    if (!this.phoneNumberId) return null;
    return `https://graph.facebook.com/${encodeURIComponent(
      this.graphApiVersion,
    )}/${encodeURIComponent(this.phoneNumberId)}/messages`;
  }

  async send(message: WhatsAppGatewayMessage): Promise<WhatsAppGatewayResult> {
    if (!this.isConfigured || !this.accessToken) {
      return {
        accepted: false,
        reason: "not_configured",
        disposition: "rejected",
      };
    }

    if (!isValidE164(message.to)) {
      return {
        accepted: false,
        reason: "invalid_recipient_address",
        disposition: "rejected",
      };
    }

    const payload = buildMetaWhatsAppTemplatePayload(message);
    const endpoint = this.endpoint();
    if (!payload || !endpoint) {
      return {
        accepted: false,
        reason: "provider_error",
        disposition: "rejected",
      };
    }

    let response: Response;
    try {
      response = await this.fetchImpl(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        redirect: "error",
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (error) {
      return {
        accepted: false,
        disposition: "ambiguous",
        reason: isTimeoutError(error) ? "timeout" : "connection_failed",
      };
    }

    if (!response.ok) {
      const failure = httpFailure(response.status);
      return {
        accepted: false,
        disposition: failure.disposition,
        reason: failure.reason,
        httpStatus: response.status,
      };
    }

    let body: unknown;
    try {
      body = await response.json();
    } catch {
      return {
        accepted: false,
        disposition: "ambiguous",
        reason: "invalid_response",
        httpStatus: response.status,
      };
    }

    const id = providerMessageId(body);
    if (!id) {
      return {
        accepted: false,
        disposition: "ambiguous",
        reason: "invalid_response",
        httpStatus: response.status,
      };
    }

    return {
      accepted: true,
      providerMessageId: id,
    };
  }
}

export function createMetaWhatsAppCloudTransport(
  env: NodeJS.ProcessEnv = process.env,
  fetchImpl?: FetchLike,
): MetaWhatsAppCloudTransport {
  return new MetaWhatsAppCloudTransport({
    ...readMetaWhatsAppConfig(env),
    ...(fetchImpl ? { fetchImpl } : {}),
  });
}
