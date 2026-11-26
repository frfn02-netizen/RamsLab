import { describe, expect, it, vi } from "vitest";

import {
  META_GRAPH_API_SUPPORTED_VERSIONS,
  META_WHATSAPP_DEFAULT_GRAPH_API_VERSION,
  getMetaWhatsAppConfigurationDiagnostics,
  readMetaWhatsAppConfig,
} from "../src/config/meta-whatsapp.js";
import {
  META_WHATSAPP_DEFAULT_TIMEOUT_MS,
  META_WHATSAPP_REMINDER_TEMPLATES,
  MetaWhatsAppCloudTransport,
  buildMetaWhatsAppTemplatePayload,
  buildMetaWhatsAppTemplatePayloadForTemplate,
  createMetaWhatsAppCloudTransport,
  isMetaWhatsAppTemplateConfigValid,
  type MetaWhatsAppTemplateConfig,
} from "../src/modules/meeting-reminders/channels/meta-whatsapp.js";
import type { WhatsAppGatewayMessage } from "../src/modules/meeting-reminders/channels/whatsapp.js";

const ACCESS_TOKEN = "meta-access-token-do-not-send";
const PHONE_NUMBER_ID = "123456789012345";
const WABA_ID = "987654321098765";
const GRAPH_API_VERSION = "v23.0";

const message: WhatsAppGatewayMessage = {
  to: "+6281234567890",
  recipientName: "Budi",
  meetingTitle: "  Rapat   Koordinasi  ",
  startAt: new Date("2040-01-02T03:00:00.000Z"),
  endAt: new Date("2040-01-02T04:00:00.000Z"),
  organizerName: "Siti",
  meetingLink: "https://meet.example.com/abc",
  detailUrl: "https://rams.example.com/meetings/abc",
  intervalMinutes: 1440,
  timezone: "Asia/Jakarta",
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function fakeFetch(
  handler: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>,
) {
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
  const fetchImpl = vi.fn(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push({ input, init });
      return handler(input, init);
    },
  );
  return {
    fetchImpl: fetchImpl as unknown as typeof fetch,
    calls,
  };
}

function transport(fetchImpl: typeof fetch) {
  return new MetaWhatsAppCloudTransport({
    accessToken: ACCESS_TOKEN,
    phoneNumberId: PHONE_NUMBER_ID,
    wabaId: WABA_ID,
    graphApiVersion: GRAPH_API_VERSION,
    timeoutMs: 5_000,
    fetchImpl,
  });
}

describe("Meta WhatsApp configuration", () => {
  it("defaults to a supported Graph API version and does not expose secrets", () => {
    const config = readMetaWhatsAppConfig({});

    expect(config).toEqual({
      accessToken: null,
      phoneNumberId: null,
      wabaId: null,
      graphApiVersion: META_WHATSAPP_DEFAULT_GRAPH_API_VERSION,
    });
    expect(
      (META_GRAPH_API_SUPPORTED_VERSIONS as readonly string[]).includes(
        META_WHATSAPP_DEFAULT_GRAPH_API_VERSION,
      ),
    ).toBe(true);

    const diagnostics = getMetaWhatsAppConfigurationDiagnostics({
      META_WHATSAPP_ACCESS_TOKEN: ACCESS_TOKEN,
      META_WHATSAPP_PHONE_NUMBER_ID: PHONE_NUMBER_ID,
      META_WHATSAPP_WABA_ID: WABA_ID,
      META_GRAPH_API_VERSION: GRAPH_API_VERSION,
    });
    expect(diagnostics).toEqual({
      configured: true,
      wabaIdConfigured: true,
      graphApiVersion: GRAPH_API_VERSION,
    });
    expect(JSON.stringify(diagnostics)).not.toContain(ACCESS_TOKEN);
    expect(JSON.stringify(diagnostics)).not.toContain(PHONE_NUMBER_ID);
    expect(JSON.stringify(diagnostics)).not.toContain(WABA_ID);
  });

  it("keeps the WABA ID optional for send readiness", async () => {
    const diagnostics = getMetaWhatsAppConfigurationDiagnostics({
      META_WHATSAPP_ACCESS_TOKEN: ACCESS_TOKEN,
      META_WHATSAPP_PHONE_NUMBER_ID: PHONE_NUMBER_ID,
      META_GRAPH_API_VERSION: GRAPH_API_VERSION,
    });
    expect(diagnostics).toEqual({
      configured: true,
      wabaIdConfigured: false,
      graphApiVersion: GRAPH_API_VERSION,
    });

    const fake = fakeFetch(async () =>
      jsonResponse({ messages: [{ id: "wamid.no-waba" }] }),
    );
    const adapter = new MetaWhatsAppCloudTransport({
      accessToken: ACCESS_TOKEN,
      phoneNumberId: PHONE_NUMBER_ID,
      wabaId: null,
      graphApiVersion: GRAPH_API_VERSION,
      fetchImpl: fake.fetchImpl,
    });

    expect(adapter.isConfigured).toBe(true);
    await expect(adapter.send(message)).resolves.toEqual({
      accepted: true,
      providerMessageId: "wamid.no-waba",
    });
    expect(fake.calls).toHaveLength(1);
  });

  it("rejects malformed Graph API versions", () => {
    expect(() =>
      readMetaWhatsAppConfig({ META_GRAPH_API_VERSION: "27.0" }),
    ).toThrow("META_GRAPH_API_VERSION");
    expect(() =>
      readMetaWhatsAppConfig({
        META_GRAPH_API_VERSION: "https://example.test",
      }),
    ).toThrow("META_GRAPH_API_VERSION");
  });

  it("rejects Graph API versions outside the explicit policy", () => {
    expect(
      (META_GRAPH_API_SUPPORTED_VERSIONS as readonly string[]).includes(
        "v27.0",
      ),
    ).toBe(false);
    expect(() =>
      readMetaWhatsAppConfig({ META_GRAPH_API_VERSION: "v27.0" }),
    ).toThrow("META_GRAPH_API_VERSION");
    expect(() =>
      readMetaWhatsAppConfig({ META_GRAPH_API_VERSION: "v99.9" }),
    ).toThrow("META_GRAPH_API_VERSION");
    expect(
      readMetaWhatsAppConfig({ META_GRAPH_API_VERSION: GRAPH_API_VERSION })
        .graphApiVersion,
    ).toBe(GRAPH_API_VERSION);
  });

  it("requires numeric phone number and WABA identifiers when they are set", () => {
    expect(() =>
      readMetaWhatsAppConfig({
        META_WHATSAPP_PHONE_NUMBER_ID: "phone-123",
        META_GRAPH_API_VERSION: GRAPH_API_VERSION,
      }),
    ).toThrow("META_WHATSAPP_PHONE_NUMBER_ID");
    expect(() =>
      readMetaWhatsAppConfig({
        META_WHATSAPP_WABA_ID: "waba-123",
        META_GRAPH_API_VERSION: GRAPH_API_VERSION,
      }),
    ).toThrow("META_WHATSAPP_WABA_ID");

    const config = readMetaWhatsAppConfig({
      META_WHATSAPP_PHONE_NUMBER_ID: "123",
      META_WHATSAPP_WABA_ID: "456",
      META_GRAPH_API_VERSION: GRAPH_API_VERSION,
    });
    expect(config).toMatchObject({ phoneNumberId: "123", wabaId: "456" });
  });
});

describe("Meta WhatsApp Cloud transport", () => {
  it("posts the Indonesian 24-hour template to the phone number messages endpoint", async () => {
    const fake = fakeFetch(async () =>
      jsonResponse({
        messaging_product: "whatsapp",
        contacts: [{ input: "6281234567890", wa_id: "6281234567890" }],
        messages: [{ id: "wamid.24h" }],
      }),
    );

    const result = await transport(fake.fetchImpl).send(message);

    expect(result).toEqual({
      accepted: true,
      providerMessageId: "wamid.24h",
    });
    expect(fake.calls).toHaveLength(1);

    const call = fake.calls[0]!;
    expect(String(call.input)).toBe(
      `https://graph.facebook.com/${GRAPH_API_VERSION}/${PHONE_NUMBER_ID}/messages`,
    );
    expect(call.init?.method).toBe("POST");
    expect(call.init?.redirect).toBe("error");
    expect(call.init?.signal).toBeInstanceOf(AbortSignal);

    const headers = new Headers(call.init?.headers);
    expect(headers.get("authorization")).toBe(`Bearer ${ACCESS_TOKEN}`);
    expect(headers.get("content-type")).toBe("application/json");

    const body = JSON.parse(String(call.init?.body)) as ReturnType<
      typeof buildMetaWhatsAppTemplatePayload
    >;
    expect(body).toMatchObject({
      messaging_product: "whatsapp",
      to: "6281234567890",
      type: "template",
      template: {
        name: "rams_meeting_reminder_24h",
        language: { code: "id" },
      },
    });
    expect(body?.template.components[0]?.parameters).toEqual([
      { type: "text", text: "Rapat Koordinasi" },
      {
        type: "text",
        text: expect.stringContaining("02 Januari 2040"),
      },
      { type: "text", text: "Siti" },
      { type: "text", text: "https://meet.example.com/abc" },
      { type: "text", text: "https://rams.example.com/meetings/abc" },
    ]);
  });

  it("maps the 1-hour reminder to the approved Indonesian template", () => {
    const payload = buildMetaWhatsAppTemplatePayload({
      ...message,
      intervalMinutes: 60,
    });

    expect(payload?.template.name).toBe("rams_meeting_reminder_1h");
    expect(payload?.template.language.code).toBe("id");
    expect(payload?.template.components[0]?.parameters).toHaveLength(5);
  });

  it("does not create a freeform message for an unsupported interval", () => {
    expect(
      buildMetaWhatsAppTemplatePayload({ ...message, intervalMinutes: 15 }),
    ).toBeNull();
  });

  it("declares each reminder template mapping independently", () => {
    const expected = {
      languageCode: "id",
      parameters: [
        "meetingTitle",
        "dateTime",
        "organizerName",
        "meetingLink",
        "detailUrl",
      ],
    };

    expect(META_WHATSAPP_REMINDER_TEMPLATES[1440]).toEqual({
      name: "rams_meeting_reminder_24h",
      ...expected,
    });
    expect(META_WHATSAPP_REMINDER_TEMPLATES[60]).toEqual({
      name: "rams_meeting_reminder_1h",
      ...expected,
    });
    expect(
      isMetaWhatsAppTemplateConfigValid(META_WHATSAPP_REMINDER_TEMPLATES[1440]),
    ).toBe(true);
    expect(
      isMetaWhatsAppTemplateConfigValid(META_WHATSAPP_REMINDER_TEMPLATES[60]),
    ).toBe(true);
  });

  it("builds from an explicitly supplied template mapping instead of an assumed shape", () => {
    const customTemplate: MetaWhatsAppTemplateConfig = {
      name: "rams_custom_reminder",
      languageCode: "id",
      parameters: ["detailUrl", "meetingTitle"],
    };

    const payload = buildMetaWhatsAppTemplatePayloadForTemplate(
      message,
      customTemplate,
    );

    expect(payload?.template.name).toBe("rams_custom_reminder");
    expect(payload?.template.language.code).toBe("id");
    expect(payload?.template.components[0]?.parameters).toEqual([
      { type: "text", text: "https://rams.example.com/meetings/abc" },
      { type: "text", text: "Rapat Koordinasi" },
    ]);
    expect(payload?.template.components[0]?.parameters).toHaveLength(2);
  });

  it("rejects invalid template configuration instead of assuming parameters", () => {
    const base: MetaWhatsAppTemplateConfig = {
      name: "rams_invalid",
      languageCode: "id",
      parameters: ["meetingTitle"],
    };

    expect(
      buildMetaWhatsAppTemplatePayloadForTemplate(message, {
        ...base,
        name: " ",
      }),
    ).toBeNull();
    expect(
      buildMetaWhatsAppTemplatePayloadForTemplate(message, {
        ...base,
        languageCode: "id-ID",
      }),
    ).toBeNull();
    expect(
      buildMetaWhatsAppTemplatePayloadForTemplate(message, {
        ...base,
        parameters: [],
      }),
    ).toBeNull();
    expect(
      buildMetaWhatsAppTemplatePayloadForTemplate(message, {
        ...base,
        parameters: ["meetingTitle", "meetingTitle"],
      }),
    ).toBeNull();
    expect(
      buildMetaWhatsAppTemplatePayloadForTemplate(message, {
        ...base,
        parameters: ["unknownField"],
      } as unknown as MetaWhatsAppTemplateConfig),
    ).toBeNull();
  });

  it("maps Meta response classes without retrying inside the transport", async () => {
    const auth = fakeFetch(async () => jsonResponse({ error: {} }, 401));
    await expect(
      transport(auth.fetchImpl).send(message),
    ).resolves.toMatchObject({
      accepted: false,
      disposition: "rejected",
      reason: "authentication_failed",
      httpStatus: 401,
    });

    const validation = fakeFetch(async () => jsonResponse({ error: {} }, 400));
    await expect(
      transport(validation.fetchImpl).send(message),
    ).resolves.toMatchObject({
      accepted: false,
      disposition: "rejected",
      reason: "provider_error",
      httpStatus: 400,
    });

    const rateLimited = fakeFetch(async () => jsonResponse({ error: {} }, 429));
    await expect(
      transport(rateLimited.fetchImpl).send(message),
    ).resolves.toMatchObject({
      accepted: false,
      disposition: "retryable",
      reason: "provider_error",
      httpStatus: 429,
    });

    const serverError = fakeFetch(async () => jsonResponse({ error: {} }, 503));
    await expect(
      transport(serverError.fetchImpl).send(message),
    ).resolves.toMatchObject({
      accepted: false,
      disposition: "ambiguous",
      reason: "provider_error",
      httpStatus: 503,
    });
  });

  it("maps malformed success responses, timeouts, and connection failures to ambiguous", async () => {
    const malformed = fakeFetch(async () => jsonResponse({ messages: [] }));
    await expect(
      transport(malformed.fetchImpl).send(message),
    ).resolves.toMatchObject({
      accepted: false,
      disposition: "ambiguous",
      reason: "invalid_response",
      httpStatus: 200,
    });

    const timeout = fakeFetch(async () => {
      const error = new Error("timeout");
      error.name = "TimeoutError";
      throw error;
    });
    await expect(transport(timeout.fetchImpl).send(message)).resolves.toEqual({
      accepted: false,
      disposition: "ambiguous",
      reason: "timeout",
    });

    const connection = fakeFetch(async () => {
      throw new Error("ECONNREFUSED");
    });
    await expect(
      transport(connection.fetchImpl).send(message),
    ).resolves.toEqual({
      accepted: false,
      disposition: "ambiguous",
      reason: "connection_failed",
    });
  });

  it("does not call Meta when configuration or the recipient is invalid", async () => {
    const fake = fakeFetch(async () =>
      jsonResponse({ messages: [{ id: "wamid.unexpected" }] }),
    );
    const unconfigured = createMetaWhatsAppCloudTransport({}, fake.fetchImpl);

    expect(unconfigured.isConfigured).toBe(false);
    await expect(unconfigured.send(message)).resolves.toMatchObject({
      accepted: false,
      disposition: "rejected",
      reason: "not_configured",
    });

    const invalidRecipient = transport(fake.fetchImpl);
    await expect(
      invalidRecipient.send({ ...message, to: "081234567890" }),
    ).resolves.toMatchObject({
      accepted: false,
      disposition: "rejected",
      reason: "invalid_recipient_address",
    });
    expect(fake.calls).toHaveLength(0);
  });

  it("does not include credentials in provider results", async () => {
    const fake = fakeFetch(async () => jsonResponse({ error: {} }, 500));
    const result = await transport(fake.fetchImpl).send(message);

    expect(JSON.stringify(result)).not.toContain(ACCESS_TOKEN);
  });

  it("uses the bounded default timeout when no test override is supplied", () => {
    const adapter = new MetaWhatsAppCloudTransport({
      accessToken: ACCESS_TOKEN,
      phoneNumberId: PHONE_NUMBER_ID,
      wabaId: WABA_ID,
      graphApiVersion: GRAPH_API_VERSION,
    });

    expect(adapter.isConfigured).toBe(true);
    expect(META_WHATSAPP_DEFAULT_TIMEOUT_MS).toBe(10_000);
  });
});
