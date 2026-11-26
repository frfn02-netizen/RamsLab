import { describe, expect, it, vi } from "vitest";

import { readMeetingReminderConfig } from "../src/config/meeting-reminders.js";
import {
  MEETING_REMINDER_INTERVALS_MINUTES,
  MEETING_REMINDER_TIMEZONE,
} from "../src/modules/meeting-reminders/meeting-reminder.constants.js";
import {
  computeScheduledFor,
  getReminderGraceMinutes,
  isInitialReminderWindowOpen,
  nextRetryDelayMs,
} from "../src/modules/meeting-reminders/meeting-reminder.service.js";
import { classifyProviderFailure } from "../src/modules/meeting-reminders/meeting-reminder.channel.js";
import {
  filterEligibleReminderRecipients,
  meetingReminderUserIds,
} from "../src/modules/meeting-reminders/meeting-reminder.recipients.js";
import {
  escapeHtml,
  formatReminderDateTime,
  renderMeetingReminderEmail,
} from "../src/modules/meeting-reminders/meeting-reminder.template.js";
import type { Meeting } from "../src/modules/meetings/meeting.types.js";
import type { UserReminderContact } from "../src/modules/users/user.types.js";
import { ObjectId } from "mongodb";

const silentLogger = {
  info: () => {},
  warn: () => {},
  error: () => {},
};

function runtimeConfig(overrides: Record<string, unknown> = {}) {
  return {
    channel: "EMAIL" as const,
    contractLegacyIndexes: false,
    pollMs: 60_000,
    timezone: MEETING_REMINDER_TIMEZONE,
    maxAttempts: 4,
    leaseMs: 120_000,
    retryBaseMs: 60_000,
    retryCapMs: 900_000,
    ...overrides,
  };
}

function user(
  id: string,
  role: UserReminderContact["role"],
  isActive = true,
  email = `${id}@example.com`,
  whatsappNumber: string | null = null,
  whatsappOptIn = false,
  whatsappConsentNumber: string | null = whatsappOptIn ? whatsappNumber : null,
): UserReminderContact {
  return {
    _id: new ObjectId(id),
    email,
    role,
    isActive,
    displayName: `User ${id.slice(-4)}`,
    whatsappNumber,
    whatsappOptIn,
    whatsappConsentNumber,
  };
}

describe("meeting reminder configuration", () => {
  it("defaults to disabled with the approved timezone and limits", () => {
    const config = readMeetingReminderConfig({});

    expect(config).toMatchObject({
      channel: "EMAIL",
      contractLegacyIndexes: false,
      timezone: "Asia/Jakarta",
      pollMs: 60_000,
      maxAttempts: 4,
      leaseMs: 120_000,
      retryBaseMs: 60_000,
      retryCapMs: 900_000,
    });
  });

  it("accepts explicit channel and integer settings", () => {
    const config = readMeetingReminderConfig({
      MEETING_REMINDER_CHANNEL: "whatsapp",
      MEETING_REMINDER_CONTRACT_LEGACY_INDEXES: "true",
      MEETING_REMINDER_POLL_MS: "5000",
      MEETING_REMINDER_TIMEZONE: "Asia/Jakarta",
      MEETING_REMINDER_MAX_ATTEMPTS: "3",
      MEETING_REMINDER_LEASE_MS: "30000",
      MEETING_REMINDER_RETRY_BASE_MS: "1000",
      MEETING_REMINDER_RETRY_CAP_MS: "8000",
    });

    expect(config).toMatchObject({
      channel: "WHATSAPP",
      contractLegacyIndexes: true,
      pollMs: 5000,
      maxAttempts: 3,
      leaseMs: 30000,
      retryBaseMs: 1000,
      retryCapMs: 8000,
    });
  });

  it("rejects invalid flags, numbers, timezones, and retry ranges", () => {
    expect(() =>
      readMeetingReminderConfig({ MEETING_REMINDER_POLL_MS: "0" }),
    ).toThrow("MEETING_REMINDER_POLL_MS");

    expect(() =>
      readMeetingReminderConfig({ MEETING_REMINDER_TIMEZONE: "Not/AZone" }),
    ).toThrow("MEETING_REMINDER_TIMEZONE");

    expect(() =>
      readMeetingReminderConfig({ MEETING_REMINDER_MAX_ATTEMPTS: "11" }),
    ).toThrow("MEETING_REMINDER_MAX_ATTEMPTS");

    expect(() =>
      readMeetingReminderConfig({
        MEETING_REMINDER_RETRY_BASE_MS: "5000",
        MEETING_REMINDER_RETRY_CAP_MS: "1000",
      }),
    ).toThrow("MEETING_REMINDER_RETRY_CAP_MS");

    expect(() =>
      readMeetingReminderConfig({ MEETING_REMINDER_CHANNEL: "sms" }),
    ).toThrow("MEETING_REMINDER_CHANNEL");

    expect(() =>
      readMeetingReminderConfig({
        MEETING_REMINDER_CONTRACT_LEGACY_INDEXES: "maybe",
      }),
    ).toThrow("MEETING_REMINDER_CONTRACT_LEGACY_INDEXES");
  });
});

describe("reminder interval and grace calculations", () => {
  const startAt = new Date("2030-06-01T12:00:00.000Z");

  it("computes the two approved intervals", () => {
    expect(MEETING_REMINDER_INTERVALS_MINUTES).toEqual([1440, 60]);
    expect(computeScheduledFor(startAt, 1440).toISOString()).toBe(
      "2030-05-31T12:00:00.000Z",
    );
    expect(computeScheduledFor(startAt, 60).toISOString()).toBe(
      "2030-06-01T11:00:00.000Z",
    );
  });

  it("uses the approved grace windows", () => {
    expect(getReminderGraceMinutes(1440)).toBe(60);
    expect(getReminderGraceMinutes(60)).toBe(10);
    expect(getReminderGraceMinutes(15)).toBe(0);
  });

  it("closes the grace window exactly at its boundary and at startAt", () => {
    const scheduledFor = computeScheduledFor(startAt, 60);

    expect(
      isInitialReminderWindowOpen({
        now: new Date(scheduledFor.getTime() + 10 * 60_000),
        startAt,
        scheduledFor,
        intervalMinutes: 60,
      }),
    ).toBe(true);

    expect(
      isInitialReminderWindowOpen({
        now: new Date(scheduledFor.getTime() + 10 * 60_000 + 1),
        startAt,
        scheduledFor,
        intervalMinutes: 60,
      }),
    ).toBe(false);

    expect(
      isInitialReminderWindowOpen({
        now: startAt,
        startAt,
        scheduledFor,
        intervalMinutes: 60,
      }),
    ).toBe(false);
  });
});

describe("retry classification and backoff", () => {
  it("retries only explicit 429 rejections", () => {
    expect(
      classifyProviderFailure({
        reason: "provider_error",
        httpStatus: 429,
      }),
    ).toBe("retryable");
  });

  it("treats definitive provider rejections as rejected", () => {
    expect(
      classifyProviderFailure({
        reason: "provider_error",
        httpStatus: 400,
      }),
    ).toBe("rejected");
    expect(classifyProviderFailure({ reason: "authentication_failed" })).toBe(
      "rejected",
    );
    expect(classifyProviderFailure({ reason: "envelope_rejected" })).toBe(
      "rejected",
    );
    expect(classifyProviderFailure({ reason: "not_configured" })).toBe(
      "rejected",
    );
    expect(
      classifyProviderFailure({ reason: "invalid_recipient_address" }),
    ).toBe("rejected");
  });

  it("treats post-transmission uncertainty as ambiguous", () => {
    for (const result of [
      { reason: "timeout" as const },
      { reason: "connection_failed" as const },
      { reason: "invalid_response" as const },
      { reason: "provider_error" as const, httpStatus: 500 },
      { reason: "provider_error" as const, httpStatus: 503 },
      { reason: "provider_error" as const },
    ]) {
      expect(classifyProviderFailure(result)).toBe("ambiguous");
    }
  });

  it("applies exponential backoff and the configured cap", () => {
    const config = runtimeConfig();

    expect(nextRetryDelayMs(1, config)).toBe(60_000);
    expect(nextRetryDelayMs(2, config)).toBe(120_000);
    expect(nextRetryDelayMs(3, config)).toBe(240_000);
    expect(nextRetryDelayMs(10, config)).toBe(900_000);
  });
});

describe("recipient resolution rules", () => {
  const organizerId = "000000000000000000000001";
  const participantId = "000000000000000000000002";

  it("keeps EMAIL recipients to ADMIN and DOSEN", () => {
    const recipients = filterEligibleReminderRecipients(
      [
        user(organizerId, "DOSEN"),
        user(participantId, "ADMIN"),
        user(participantId, "ADMIN"),
        user("000000000000000000000003", "ALUMNI"),
        user("000000000000000000000004", "DOSEN", false),
        user("000000000000000000000005", "STUDENT"),
      ],
      "EMAIL",
    );

    expect(recipients.map((recipient) => recipient.userId)).toEqual([
      organizerId,
      participantId,
    ]);
  });

  it("excludes STUDENT accounts from WHATSAPP recipients", () => {
    const recipients = filterEligibleReminderRecipients(
      [
        user(
          organizerId,
          "DOSEN",
          true,
          "a@example.com",
          "+628111111111",
          true,
        ),
        user(
          participantId,
          "STUDENT",
          true,
          "b@example.com",
          "+6281222222222",
          true,
        ),
      ],
      "WHATSAPP",
    );

    expect(recipients.map((recipient) => recipient.userId)).toEqual([
      organizerId,
    ]);
    expect(recipients.map((recipient) => recipient.whatsappNumber)).toEqual([
      "+628111111111",
    ]);
  });

  it("builds a deduplicated organizer plus participant id set", () => {
    const meeting = {
      _id: new ObjectId(),
      createdBy: new ObjectId(organizerId),
      organizerId: new ObjectId(organizerId),
      participantIds: [
        new ObjectId(organizerId),
        new ObjectId(participantId),
        new ObjectId(participantId),
      ],
    } as Meeting;

    expect(meetingReminderUserIds(meeting).map((id) => id.toString())).toEqual([
      organizerId,
      participantId,
    ]);
  });
});

describe("email template", () => {
  const meeting = {
    _id: new ObjectId("000000000000000000000010"),
    title: "Research sync <script>alert(1)</script>",
    description: "Discuss <b>progress</b> & next steps",
    startAt: new Date("2026-01-01T17:30:00.000Z"),
    endAt: new Date("2026-01-01T18:30:00.000Z"),
    meetingLink: "https://meet.example.com/abc",
  } as Meeting;

  const recipient = {
    userId: "000000000000000000000011",
    email: "recipient@example.com",
    displayName: "Recipient",
    role: "DOSEN" as const,
    whatsappNumber: null,
  };

  it("formats Asia/Jakarta time across the UTC day boundary", () => {
    const formatted = formatReminderDateTime(meeting.startAt, "Asia/Jakarta");

    expect(formatted).toContain("02 January 2026");
    expect(formatted).toContain("00:30");
    expect(formatted).toContain("Asia/Jakarta");
  });

  it("escapes HTML interpolation", () => {
    expect(escapeHtml(`<a href="x">'&'</a>`)).toBe(
      "&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;",
    );
  });

  it("renders the title, time, duration, organizer, link, and detail URL", () => {
    const rendered = renderMeetingReminderEmail({
      meeting,
      recipient,
      organizerName: "Organizer <Name>",
      timezone: "Asia/Jakarta",
    });

    expect(rendered.subject).not.toContain("\n");
    expect(rendered.text).toContain("Research sync");
    expect(rendered.text).toContain("00:30");
    expect(rendered.text).toContain("Asia/Jakarta");
    expect(rendered.text).toContain("1 hour");
    expect(rendered.text).toContain("Organizer <Name>");
    expect(rendered.text).toContain("https://meet.example.com/abc");
    expect(rendered.text).toContain("/meetings/000000000000000000000010");
    expect(rendered.html).toContain("&lt;script&gt;");
    expect(rendered.html).toContain("&lt;b&gt;progress&lt;/b&gt; &amp;");
    expect(rendered.html).not.toContain("<script>");
  });

  it("omits unsafe meeting links", () => {
    const rendered = renderMeetingReminderEmail({
      meeting: { ...meeting, meetingLink: "javascript:alert(1)" } as Meeting,
      recipient,
      organizerName: "Organizer",
      timezone: "Asia/Jakarta",
    });

    expect(rendered.text).not.toContain("javascript:");
    expect(rendered.html).not.toContain("javascript:");
  });
});
