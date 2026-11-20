import { describe, expect, it, vi } from "vitest";

import { readMeetingReminderConfig } from "../src/config/meeting-reminders.js";
import {
  MEETING_REMINDER_INTERVALS_MINUTES,
  MEETING_REMINDER_TIMEZONE,
} from "../src/modules/meeting-reminders/meeting-reminder.constants.js";
import {
  classifyReminderFailure,
  computeScheduledFor,
  getReminderGraceMinutes,
  isInitialReminderWindowOpen,
  nextRetryDelayMs,
} from "../src/modules/meeting-reminders/meeting-reminder.service.js";
import {
  filterEligibleReminderRecipients,
  meetingReminderUserIds,
} from "../src/modules/meeting-reminders/meeting-reminder.recipients.js";
import {
  escapeHtml,
  formatReminderDateTime,
  renderMeetingReminderEmail,
} from "../src/modules/meeting-reminders/meeting-reminder.template.js";
import { startMeetingReminderScheduler } from "../src/modules/meeting-reminders/meeting-reminder.scheduler.js";
import type { Meeting } from "../src/modules/meetings/meeting.types.js";
import type { UserDirectoryEntry } from "../src/modules/users/user.types.js";
import { ObjectId } from "mongodb";

const silentLogger = {
  info: () => {},
  warn: () => {},
  error: () => {},
};

function enabledConfig(overrides: Record<string, unknown> = {}) {
  return {
    enabled: true,
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
  role: UserDirectoryEntry["role"],
  isActive = true,
  email = `${id}@example.com`,
): UserDirectoryEntry {
  return {
    _id: new ObjectId(id),
    email,
    role,
    isActive,
    displayName: `User ${id.slice(-4)}`,
  };
}

describe("meeting reminder configuration", () => {
  it("defaults to disabled with the approved timezone and limits", () => {
    const config = readMeetingReminderConfig({});

    expect(config).toMatchObject({
      enabled: false,
      timezone: "Asia/Jakarta",
      pollMs: 60_000,
      maxAttempts: 4,
      leaseMs: 120_000,
      retryBaseMs: 60_000,
      retryCapMs: 900_000,
    });
  });

  it("accepts explicit enabled values and integer settings", () => {
    const config = readMeetingReminderConfig({
      MEETING_REMINDERS_ENABLED: "true",
      MEETING_REMINDER_POLL_MS: "5000",
      MEETING_REMINDER_TIMEZONE: "Asia/Jakarta",
      MEETING_REMINDER_MAX_ATTEMPTS: "3",
      MEETING_REMINDER_LEASE_MS: "30000",
      MEETING_REMINDER_RETRY_BASE_MS: "1000",
      MEETING_REMINDER_RETRY_CAP_MS: "8000",
    });

    expect(config).toMatchObject({
      enabled: true,
      pollMs: 5000,
      maxAttempts: 3,
      leaseMs: 30000,
      retryBaseMs: 1000,
      retryCapMs: 8000,
    });
  });

  it("rejects invalid flags, numbers, timezones, and retry ranges", () => {
    expect(() =>
      readMeetingReminderConfig({ MEETING_REMINDERS_ENABLED: "maybe" }),
    ).toThrow("MEETING_REMINDERS_ENABLED");

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
  });
});

describe("reminder interval and grace calculations", () => {
  const startAt = new Date("2030-06-01T12:00:00.000Z");

  it("computes all approved intervals", () => {
    expect(MEETING_REMINDER_INTERVALS_MINUTES).toEqual([1440, 60, 15]);
    expect(computeScheduledFor(startAt, 1440).toISOString()).toBe(
      "2030-05-31T12:00:00.000Z",
    );
    expect(computeScheduledFor(startAt, 60).toISOString()).toBe(
      "2030-06-01T11:00:00.000Z",
    );
    expect(computeScheduledFor(startAt, 15).toISOString()).toBe(
      "2030-06-01T11:45:00.000Z",
    );
  });

  it("uses the approved grace windows", () => {
    expect(getReminderGraceMinutes(1440)).toBe(60);
    expect(getReminderGraceMinutes(60)).toBe(10);
    expect(getReminderGraceMinutes(15)).toBe(5);
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
  const base = {
    sent: false,
    status: "failed" as const,
    provider: "test",
  };

  it("retries only explicit 429 rejections", () => {
    expect(
      classifyReminderFailure({
        ...base,
        reason: "provider_error",
        httpStatus: 429,
      }),
    ).toBe("retryable");
  });

  it("treats definitive provider rejections as rejected", () => {
    expect(
      classifyReminderFailure({
        ...base,
        reason: "provider_error",
        httpStatus: 400,
      }),
    ).toBe("rejected");
    expect(
      classifyReminderFailure({ ...base, reason: "authentication_failed" }),
    ).toBe("rejected");
    expect(
      classifyReminderFailure({ ...base, reason: "envelope_rejected" }),
    ).toBe("rejected");
    expect(
      classifyReminderFailure({ ...base, reason: "not_configured" }),
    ).toBe("rejected");
  });

  it("treats post-transmission uncertainty as ambiguous", () => {
    for (const result of [
      { ...base, reason: "timeout" as const },
      { ...base, reason: "connection_failed" as const },
      { ...base, reason: "invalid_response" as const },
      { ...base, reason: "provider_error" as const, httpStatus: 500 },
      { ...base, reason: "provider_error" as const, httpStatus: 503 },
      { ...base, reason: "provider_error" as const },
    ]) {
      expect(classifyReminderFailure(result)).toBe("ambiguous");
    }
  });

  it("applies exponential backoff and the configured cap", () => {
    const config = enabledConfig();

    expect(nextRetryDelayMs(1, config)).toBe(60_000);
    expect(nextRetryDelayMs(2, config)).toBe(120_000);
    expect(nextRetryDelayMs(3, config)).toBe(240_000);
    expect(nextRetryDelayMs(10, config)).toBe(900_000);
  });
});

describe("recipient resolution rules", () => {
  const organizerId = "000000000000000000000001";
  const participantId = "000000000000000000000002";

  it("deduplicates, filters roles and active status, and keeps the organizer", () => {
    const recipients = filterEligibleReminderRecipients([
      user(organizerId, "DOSEN"),
      user(participantId, "ADMIN"),
      user(participantId, "ADMIN"),
      user("000000000000000000000003", "ALUMNI"),
      user("000000000000000000000004", "DOSEN", false),
    ]);

    expect(recipients.map((recipient) => recipient.userId)).toEqual([
      organizerId,
      participantId,
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
  };

  it("formats Asia/Jakarta time across the UTC day boundary", () => {
    const formatted = formatReminderDateTime(
      meeting.startAt,
      "Asia/Jakarta",
    );

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

describe("scheduler lifecycle", () => {
  it("does nothing when the feature flag is disabled", async () => {
    const runCycle = vi.fn().mockResolvedValue({});
    const handle = startMeetingReminderScheduler({
      config: enabledConfig({ enabled: false }),
      logger: silentLogger,
      runCycle,
    });

    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(runCycle).not.toHaveBeenCalled();
    expect(handle.isRunning()).toBe(false);
    await handle.stop(100);
  });

  it("runs immediately, prevents overlap, and drains on stop", async () => {
    let resolveCycle!: () => void;
    const cycle = new Promise<{
      enabled: boolean;
      scannedMeetings: number;
      createdDeliveries: number;
      revivedDeliveries: number;
      cancelledDeliveries: number;
      sent: number;
      retried: number;
      failed: number;
      unknown: number;
      missed: number;
    }>((resolve) => {
      resolveCycle = () =>
        resolve({
          enabled: true,
          scannedMeetings: 0,
          createdDeliveries: 0,
          revivedDeliveries: 0,
          cancelledDeliveries: 0,
          sent: 0,
          retried: 0,
          failed: 0,
          unknown: 0,
          missed: 0,
        });
    });
    const runCycle = vi.fn().mockImplementation(() => cycle);
    const handle = startMeetingReminderScheduler({
      config: enabledConfig({ pollMs: 1000 }),
      logger: silentLogger,
      runCycle,
    });

    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(runCycle).toHaveBeenCalledTimes(1);
    expect(handle.isRunning()).toBe(true);

    const stopPromise = handle.stop(1000);
    resolveCycle();
    await stopPromise;

    expect(handle.isRunning()).toBe(false);
    expect(runCycle).toHaveBeenCalledTimes(1);
  });
});
