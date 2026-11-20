import {
  MEETING_REMINDER_DEFAULT_POLL_MS,
  MEETING_REMINDER_LEASE_MS,
  MEETING_REMINDER_MAX_ATTEMPTS,
  MEETING_REMINDER_RETRY_BASE_MS,
  MEETING_REMINDER_RETRY_CAP_MS,
  MEETING_REMINDER_TIMEZONE,
} from "../modules/meeting-reminders/meeting-reminder.constants.js";

export interface MeetingReminderRuntimeConfig {
  enabled: boolean;
  pollMs: number;
  timezone: string;
  maxAttempts: number;
  leaseMs: number;
  retryBaseMs: number;
  retryCapMs: number;
}

function readBoolean(value: string | undefined): boolean {
  if (value === undefined || value.trim() === "") return false;
  const normalized = value.trim().toLowerCase();
  if (normalized === "true") return true;
  if (normalized === "false") return false;
  throw new Error("MEETING_REMINDERS_ENABLED must be true or false");
}

function readInteger(
  value: string | undefined,
  fallback: number,
  name: string,
  minimum: number,
  maximum: number,
): number {
  if (value === undefined || value.trim() === "") return fallback;
  if (!/^\d+$/.test(value.trim())) {
    throw new Error(`${name} must be a whole number`);
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < minimum || parsed > maximum) {
    throw new Error(`${name} must be between ${minimum} and ${maximum}`);
  }
  return parsed;
}

function readTimezone(value: string | undefined): string {
  const timezone = value?.trim() || MEETING_REMINDER_TIMEZONE;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format(new Date());
  } catch {
    throw new Error("MEETING_REMINDER_TIMEZONE must be a valid IANA timezone");
  }
  return timezone;
}

export function readMeetingReminderConfig(
  env: NodeJS.ProcessEnv = process.env,
): MeetingReminderRuntimeConfig {
  const retryBaseMs = readInteger(
    env.MEETING_REMINDER_RETRY_BASE_MS,
    MEETING_REMINDER_RETRY_BASE_MS,
    "MEETING_REMINDER_RETRY_BASE_MS",
    1_000,
    3_600_000,
  );
  const retryCapMs = readInteger(
    env.MEETING_REMINDER_RETRY_CAP_MS,
    MEETING_REMINDER_RETRY_CAP_MS,
    "MEETING_REMINDER_RETRY_CAP_MS",
    retryBaseMs,
    86_400_000,
  );

  return {
    enabled: readBoolean(env.MEETING_REMINDERS_ENABLED),
    pollMs: readInteger(
      env.MEETING_REMINDER_POLL_MS,
      MEETING_REMINDER_DEFAULT_POLL_MS,
      "MEETING_REMINDER_POLL_MS",
      1_000,
      3_600_000,
    ),
    timezone: readTimezone(env.MEETING_REMINDER_TIMEZONE),
    maxAttempts: readInteger(
      env.MEETING_REMINDER_MAX_ATTEMPTS,
      MEETING_REMINDER_MAX_ATTEMPTS,
      "MEETING_REMINDER_MAX_ATTEMPTS",
      1,
      10,
    ),
    leaseMs: readInteger(
      env.MEETING_REMINDER_LEASE_MS,
      MEETING_REMINDER_LEASE_MS,
      "MEETING_REMINDER_LEASE_MS",
      15_000,
      3_600_000,
    ),
    retryBaseMs,
    retryCapMs,
  };
}
