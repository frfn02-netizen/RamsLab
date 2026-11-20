export const MEETING_REMINDER_COLLECTION = "meeting_reminder_deliveries";

export const MEETING_REMINDER_INTERVALS_MINUTES = [1440, 60, 15] as const;
export type MeetingReminderIntervalMinutes =
  (typeof MEETING_REMINDER_INTERVALS_MINUTES)[number];

export const MEETING_REMINDER_GRACE_MINUTES: Record<
  MeetingReminderIntervalMinutes,
  number
> = {
  1440: 60,
  60: 10,
  15: 5,
};

export const MEETING_REMINDER_TIMEZONE = "Asia/Jakarta";
export const MEETING_REMINDER_DEFAULT_POLL_MS = 60_000;
export const MEETING_REMINDER_MAX_ATTEMPTS = 4;
export const MEETING_REMINDER_LEASE_MS = 120_000;
export const MEETING_REMINDER_RETRY_BASE_MS = 60_000;
export const MEETING_REMINDER_RETRY_CAP_MS = 15 * 60_000;

export const MINUTE_MS = 60_000;
