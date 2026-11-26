import { randomBytes } from "node:crypto";
import { hostname } from "node:os";
import { ObjectId } from "mongodb";

import {
  readMeetingReminderConfig,
  type MeetingReminderRuntimeConfig,
} from "../../config/meeting-reminders.js";
import { findMeetingById } from "../meetings/meeting.repository.js";
import type { Meeting } from "../meetings/meeting.types.js";
import {
  acquireMeetingReminderChannelLease,
  meetingReminderChannelLeaseMs,
} from "./meeting-reminder.channel-lease.js";
import { createMeetingReminderChannelAdapter } from "./meeting-reminder.channel-factory.js";
import type {
  MeetingReminderChannelAdapter,
  MeetingReminderSendResult,
} from "./meeting-reminder.channel.js";
import {
  MEETING_REMINDER_GRACE_MINUTES,
  MEETING_REMINDER_INTERVALS_MINUTES,
  MINUTE_MS,
} from "./meeting-reminder.constants.js";
import {
  cancelPendingRemindersForIneligibleRecipients,
  cancelPendingRemindersForIntervalsNotIn,
  cancelPendingRemindersForOtherChannels,
  cancelStalePendingReminders,
  claimReminderDelivery,
  expireSendingReminderLeases,
  findDueReminderDeliveries,
  findMeetingsForRemindersByIds,
  findPendingReminderDeliveries,
  findUpcomingReminderMeetings,
  insertReminderDeliveryIfAbsent,
  markPendingFirstAttemptsMissed,
  markPendingReminderStatus,
  markReminderRetry,
  markReminderSent,
  markReminderTerminal,
  reviveCancelledReminderDelivery,
} from "./meeting-reminder.repository.js";
import {
  meetingReminderUserIds,
  resolveEligibleReminderRecipient,
  resolveMeetingOrganizerName,
  resolveMeetingReminderRecipients,
} from "./meeting-reminder.recipients.js";
import type {
  MeetingReminderChannel,
  MeetingReminderCycleSummary,
  MeetingReminderDelivery,
  MeetingReminderDeliveryKey,
  MeetingReminderFailureReason,
  MeetingReminderRecipient,
} from "./meeting-reminder.types.js";

const MAX_MEETINGS_PER_CYCLE = 200;
const MAX_DELIVERIES_PER_CYCLE = 200;
const CLEANUP_BATCH_SIZE = 200;
const MAX_CLEANUP_BATCHES = 5;

export type MeetingReminderLogger = Pick<Console, "info" | "warn" | "error">;

export interface RunMeetingReminderCycleOptions {
  now?: Date;
  config?: MeetingReminderRuntimeConfig;
  instanceId?: string;
  channel?: MeetingReminderChannel;
  adapter?: MeetingReminderChannelAdapter;
  logger?: MeetingReminderLogger;
}

interface ReconcileContext {
  now: Date;
  config: MeetingReminderRuntimeConfig;
  channel: MeetingReminderChannel;
  logger: MeetingReminderLogger;
  summary: MeetingReminderCycleSummary;
}

interface DispatchContext extends ReconcileContext {
  instanceId: string;
  adapter: MeetingReminderChannelAdapter;
}

function emptySummary(): MeetingReminderCycleSummary {
  return {
    scannedMeetings: 0,
    createdDeliveries: 0,
    revivedDeliveries: 0,
    cancelledDeliveries: 0,
    sent: 0,
    retried: 0,
    failed: 0,
    unknown: 0,
    missed: 0,
  };
}

export function createMeetingReminderInstanceId(): string {
  return `${hostname()}:${process.pid}:${randomBytes(4).toString("hex")}`;
}

export function computeScheduledFor(
  startAt: Date,
  intervalMinutes: number,
): Date {
  return new Date(startAt.getTime() - intervalMinutes * MINUTE_MS);
}

export function getReminderGraceMinutes(intervalMinutes: number): number {
  return (
    MEETING_REMINDER_GRACE_MINUTES[
      intervalMinutes as keyof typeof MEETING_REMINDER_GRACE_MINUTES
    ] ?? 0
  );
}

export function isInitialReminderWindowOpen(options: {
  now: Date;
  startAt: Date;
  scheduledFor: Date;
  intervalMinutes: number;
}): boolean {
  const graceMs = getReminderGraceMinutes(options.intervalMinutes) * MINUTE_MS;
  return (
    options.now.getTime() < options.startAt.getTime() &&
    options.now.getTime() <= options.scheduledFor.getTime() + graceMs
  );
}

export function nextRetryDelayMs(
  attempts: number,
  config: MeetingReminderRuntimeConfig,
): number {
  const exponent = Math.max(0, attempts - 1);
  return Math.min(config.retryBaseMs * 2 ** exponent, config.retryCapMs);
}

function failureReason(
  result: MeetingReminderSendResult,
): MeetingReminderFailureReason {
  return result.reason ?? "provider_error";
}

function activeLogger(logger?: MeetingReminderLogger): MeetingReminderLogger {
  return logger ?? console;
}

function maxIntervalMinutes(): number {
  return Math.max(...MEETING_REMINDER_INTERVALS_MINUTES);
}

export function meetingReminderHorizonEnd(
  now: Date,
  config: MeetingReminderRuntimeConfig,
): Date {
  const intervalMs = maxIntervalMinutes() * MINUTE_MS;
  const graceMs = getReminderGraceMinutes(maxIntervalMinutes()) * MINUTE_MS;
  return new Date(now.getTime() + intervalMs + graceMs + config.pollMs);
}

function buildDeliveryKey(
  meeting: Meeting,
  intervalMinutes: number,
  recipient: MeetingReminderRecipient,
  scheduledFor: Date,
  channel: MeetingReminderChannel,
): MeetingReminderDeliveryKey | null {
  if (!meeting._id) return null;
  return {
    meetingId: meeting._id,
    meetingStartAt: meeting.startAt,
    intervalMinutes,
    recipientKind: "USER",
    recipientId: recipient.userId,
    scheduledFor,
    channel,
  };
}

async function reconcileMeetingDeliveries(
  meeting: Meeting,
  context: ReconcileContext,
): Promise<void> {
  const { now, channel, logger, summary } = context;
  const recipients = await resolveMeetingReminderRecipients(meeting, channel);

  summary.cancelledDeliveries += await cancelStalePendingReminders({
    meetingId: meeting._id,
    currentStartAt: meeting.startAt,
    now,
    channel,
  });
  summary.cancelledDeliveries += await cancelPendingRemindersForIntervalsNotIn({
    meetingId: meeting._id,
    intervals: MEETING_REMINDER_INTERVALS_MINUTES,
    now,
    channel,
  });
  summary.cancelledDeliveries +=
    await cancelPendingRemindersForIneligibleRecipients({
      meetingId: meeting._id,
      channel,
      eligibleRecipientIds: recipients.map((recipient) => recipient.userId),
      now,
    });

  if (recipients.length === 0) return;

  const createdBefore = summary.createdDeliveries;
  const revivedBefore = summary.revivedDeliveries;

  for (const intervalMinutes of MEETING_REMINDER_INTERVALS_MINUTES) {
    const scheduledFor = computeScheduledFor(meeting.startAt, intervalMinutes);
    const graceMs = getReminderGraceMinutes(intervalMinutes) * MINUTE_MS;
    const windowOpen = isInitialReminderWindowOpen({
      now,
      startAt: meeting.startAt,
      scheduledFor,
      intervalMinutes,
    });
    const desiredStatus: "pending" | "missed" = windowOpen
      ? "pending"
      : "missed";

    for (const recipient of recipients) {
      const key = buildDeliveryKey(
        meeting,
        intervalMinutes,
        recipient,
        scheduledFor,
        channel,
      );
      if (!key) continue;

      const inserted = await insertReminderDeliveryIfAbsent(
        key,
        desiredStatus,
        now,
      );
      if (inserted.created) {
        summary.createdDeliveries += 1;
        continue;
      }

      if (
        inserted.delivery.status === "cancelled" &&
        inserted.delivery.meetingStartAt.getTime() ===
          meeting.startAt.getTime() &&
        windowOpen
      ) {
        if (await reviveCancelledReminderDelivery(key, now)) {
          summary.revivedDeliveries += 1;
        }
      }
    }

    summary.missed += await markPendingFirstAttemptsMissed({
      meetingId: meeting._id,
      intervalMinutes,
      cutoff: new Date(now.getTime() - graceMs),
      now,
      channel,
    });
  }

  if (
    summary.createdDeliveries > createdBefore ||
    summary.revivedDeliveries > revivedBefore
  ) {
    logger.info("Meeting reminder deliveries reconciled", {
      meetingId: meeting._id?.toString() ?? null,
      recipientCount: recipients.length,
      intervals: MEETING_REMINDER_INTERVALS_MINUTES,
      channel,
    });
  }
}

function safeDeliveryLogContext(
  delivery: MeetingReminderDelivery,
  extra: Record<string, unknown> = {},
) {
  return {
    deliveryId: delivery._id?.toString() ?? null,
    meetingId: delivery.meetingId.toString(),
    recipientUserId: delivery.recipientId,
    intervalMinutes: delivery.intervalMinutes,
    attempts: delivery.attempts,
    ...extra,
  };
}

async function cancelClaimedDelivery(
  delivery: MeetingReminderDelivery,
  context: DispatchContext,
  status: "cancelled" | "missed",
): Promise<void> {
  if (!delivery._id) return;
  await markReminderTerminal({
    id: delivery._id,
    leaseOwner: context.instanceId,
    now: context.now,
    status,
    reason: null,
  });
  if (status === "cancelled") context.summary.cancelledDeliveries += 1;
  else context.summary.missed += 1;
}

async function dispatchDelivery(
  delivery: MeetingReminderDelivery,
  context: DispatchContext,
): Promise<void> {
  const { now, config, channel, logger, summary } = context;

  if ((delivery.channel ?? "EMAIL") !== channel) return;

  const meeting = await findMeetingById(delivery.meetingId.toString());
  if (!meeting || meeting.cancelledAt) {
    await markPendingReminderStatus({
      id: delivery._id,
      now,
      status: "cancelled",
    });
    summary.cancelledDeliveries += 1;
    return;
  }

  if (meeting.startAt.getTime() !== delivery.meetingStartAt.getTime()) {
    await markPendingReminderStatus({
      id: delivery._id,
      now,
      status: "cancelled",
    });
    summary.cancelledDeliveries += 1;
    return;
  }

  if (now.getTime() >= meeting.startAt.getTime()) {
    await markPendingReminderStatus({
      id: delivery._id,
      now,
      status: "missed",
    });
    summary.missed += 1;
    return;
  }

  const recipient = await resolveEligibleReminderRecipient(
    meeting,
    delivery.recipientId,
    channel,
  );
  if (!recipient) {
    await markPendingReminderStatus({
      id: delivery._id,
      now,
      status: "cancelled",
    });
    summary.cancelledDeliveries += 1;
    return;
  }

  const organizerName = await resolveMeetingOrganizerName(meeting);

  const claimed = await claimReminderDelivery({
    id: delivery._id,
    leaseOwner: context.instanceId,
    now,
    leaseMs: config.leaseMs,
    maxAttempts: config.maxAttempts,
  });
  if (!claimed) return;

  const freshMeeting = await findMeetingById(claimed.meetingId.toString());
  if (
    !freshMeeting ||
    freshMeeting.cancelledAt ||
    freshMeeting.startAt.getTime() !== claimed.meetingStartAt.getTime()
  ) {
    await cancelClaimedDelivery(claimed, context, "cancelled");
    return;
  }

  if (now.getTime() >= freshMeeting.startAt.getTime()) {
    await cancelClaimedDelivery(claimed, context, "missed");
    return;
  }

  const freshRecipient = await resolveEligibleReminderRecipient(
    freshMeeting,
    claimed.recipientId,
    channel,
  );
  if (!freshRecipient) {
    await cancelClaimedDelivery(claimed, context, "cancelled");
    return;
  }

  let result: MeetingReminderSendResult;
  try {
    result = await context.adapter.send({
      meeting: freshMeeting,
      recipient: freshRecipient,
      organizerName,
      timezone: config.timezone,
      intervalMinutes: claimed.intervalMinutes,
    });
  } catch {
    if (claimed._id) {
      const marked = await markReminderTerminal({
        id: claimed._id,
        leaseOwner: context.instanceId,
        now,
        status: "unknown",
        reason: "connection_failed",
      });
      if (marked) summary.unknown += 1;
      logger.error(
        "Meeting reminder send outcome unknown",
        safeDeliveryLogContext(claimed, { reason: "connection_failed" }),
      );
    }
    return;
  }

  if (result.disposition === "accepted") {
    if (!claimed._id) return;
    const persisted = await markReminderSent({
      id: claimed._id,
      leaseOwner: context.instanceId,
      now,
      provider: result.provider,
      providerMessageId: result.providerMessageId,
    });
    if (persisted) {
      summary.sent += 1;
      logger.info(
        "Meeting reminder accepted by provider",
        safeDeliveryLogContext(claimed, {
          provider: result.provider,
          providerMessageId: result.providerMessageId ?? null,
        }),
      );
    } else {
      logger.error(
        "Meeting reminder acceptance could not be persisted",
        safeDeliveryLogContext(claimed, { provider: result.provider }),
      );
    }
    return;
  }

  const reason = failureReason(result);

  if (
    result.disposition === "retryable" &&
    claimed.attempts < config.maxAttempts &&
    claimed._id
  ) {
    const nextAttemptAt = new Date(
      now.getTime() + nextRetryDelayMs(claimed.attempts, config),
    );
    if (nextAttemptAt.getTime() < freshMeeting.startAt.getTime()) {
      const retried = await markReminderRetry({
        id: claimed._id,
        leaseOwner: context.instanceId,
        now,
        nextAttemptAt,
        reason,
      });
      if (retried) {
        summary.retried += 1;
        logger.warn(
          "Meeting reminder retry scheduled",
          safeDeliveryLogContext(claimed, {
            provider: result.provider,
            httpStatus: result.httpStatus ?? null,
            reason,
            nextAttemptAt: nextAttemptAt.toISOString(),
          }),
        );
      }
      return;
    }
  }

  const terminalStatus =
    result.disposition === "ambiguous" ? "unknown" : "failed";
  if (claimed._id) {
    const marked = await markReminderTerminal({
      id: claimed._id,
      leaseOwner: context.instanceId,
      now,
      status: terminalStatus,
      reason,
    });
    if (marked) {
      if (terminalStatus === "unknown") summary.unknown += 1;
      else summary.failed += 1;
    }
  }

  logger.error(
    terminalStatus === "unknown"
      ? "Meeting reminder delivery outcome unknown"
      : "Meeting reminder delivery failed",
    safeDeliveryLogContext(claimed, {
      provider: result.provider,
      httpStatus: result.httpStatus ?? null,
      reason,
      disposition: result.disposition,
    }),
  );
}

export async function cleanupObsoleteDeliveries(options: {
  now: Date;
  config: MeetingReminderRuntimeConfig;
  logger?: MeetingReminderLogger;
  channel?: MeetingReminderChannel;
  cancelOtherChannels?: boolean;
}): Promise<{
  cancelled: number;
  missed: number;
  unknown: number;
}> {
  const logger = activeLogger(options.logger);
  const channel = options.channel ?? options.config.channel;
  const unknown = await expireSendingReminderLeases(options.now);
  if (unknown > 0) {
    logger.warn("Meeting reminder leases expired without a final state", {
      count: unknown,
      channel,
    });
  }

  let cancelled =
    options.cancelOtherChannels === false
      ? 0
      : await cancelPendingRemindersForOtherChannels({
          channel,
          now: options.now,
        });
  let missed = 0;
  let afterId: MeetingReminderDelivery["_id"] | undefined;

  for (let batch = 0; batch < MAX_CLEANUP_BATCHES; batch += 1) {
    const pending = await findPendingReminderDeliveries({
      limit: CLEANUP_BATCH_SIZE,
      afterId,
      channel,
    });
    if (pending.length === 0) break;

    afterId = pending[pending.length - 1]?._id;
    const meetingIds = [
      ...new Set(pending.map((delivery) => delivery.meetingId.toString())),
    ].map((id) => new ObjectId(id));
    const meetings = await findMeetingsForRemindersByIds(meetingIds);
    const meetingById = new Map(
      meetings.map((meeting) => [meeting._id?.toString() ?? "", meeting]),
    );
    const configuredIntervals = new Set<number>(
      MEETING_REMINDER_INTERVALS_MINUTES,
    );

    for (const delivery of pending) {
      const meeting = meetingById.get(delivery.meetingId.toString());
      let status: "cancelled" | "missed" | null = null;

      if (!meeting || meeting.cancelledAt) {
        status = "cancelled";
      } else if (
        meeting.startAt.getTime() !== delivery.meetingStartAt.getTime()
      ) {
        status = "cancelled";
      } else if (!configuredIntervals.has(delivery.intervalMinutes)) {
        status = "cancelled";
      } else if (options.now.getTime() >= meeting.startAt.getTime()) {
        status = "missed";
      }

      if (!status) continue;

      const freshMeeting = await findMeetingById(delivery.meetingId.toString());
      if (!freshMeeting || freshMeeting.cancelledAt) {
        status = "cancelled";
      } else if (
        freshMeeting.startAt.getTime() !== delivery.meetingStartAt.getTime()
      ) {
        status = "cancelled";
      } else if (!configuredIntervals.has(delivery.intervalMinutes)) {
        status = "cancelled";
      } else if (options.now.getTime() >= freshMeeting.startAt.getTime()) {
        status = "missed";
      } else {
        continue;
      }

      const changed = await markPendingReminderStatus({
        id: delivery._id,
        now: options.now,
        status,
      });
      if (changed && status === "cancelled") cancelled += 1;
      if (changed && status === "missed") missed += 1;
    }
  }

  return { cancelled, missed, unknown };
}

export async function runMeetingReminderCycle(
  options: RunMeetingReminderCycleOptions = {},
): Promise<MeetingReminderCycleSummary> {
  const now = options.now ?? new Date();
  const config = options.config ?? readMeetingReminderConfig();
  const logger = activeLogger(options.logger);
  const summary = emptySummary();

  const channel = options.channel ?? config.channel;
  const adapter =
    options.adapter ?? createMeetingReminderChannelAdapter(channel);
  if (adapter.channel !== channel) {
    logger.error("Meeting reminder channel adapter mismatch", {
      channel,
      adapterChannel: adapter.channel,
    });
    return summary;
  }

  const instanceId = options.instanceId ?? createMeetingReminderInstanceId();

  if (!adapter.isConfigured) {
    logger.warn("Meeting reminder channel is not configured; cleanup only", {
      channel,
      provider: adapter.name,
    });
    const cleanup = await cleanupObsoleteDeliveries({
      now,
      config,
      logger,
      channel,
      cancelOtherChannels: false,
    });
    summary.cancelledDeliveries += cleanup.cancelled;
    summary.missed += cleanup.missed;
    summary.unknown += cleanup.unknown;
    return summary;
  }

  const lease = await acquireMeetingReminderChannelLease({
    channel,
    owner: instanceId,
    now,
    leaseMs: meetingReminderChannelLeaseMs(config.pollMs),
  });
  if (!lease.acquired) {
    logger.warn("Meeting reminder channel is owned by another channel", {
      channel,
      activeChannel: lease.channel ?? null,
    });
    return summary;
  }

  const meetings = await findUpcomingReminderMeetings({
    now,
    horizonEnd: meetingReminderHorizonEnd(now, config),
    limit: MAX_MEETINGS_PER_CYCLE,
  });

  summary.scannedMeetings = meetings.length;
  const reconcileContext: ReconcileContext = {
    now,
    config,
    channel,
    logger,
    summary,
  };

  for (const meeting of meetings) {
    await reconcileMeetingDeliveries(meeting, reconcileContext);
  }

  const due = await findDueReminderDeliveries(
    now,
    MAX_DELIVERIES_PER_CYCLE,
    channel,
  );
  const dispatchContext: DispatchContext = {
    ...reconcileContext,
    instanceId,
    adapter,
  };

  for (const delivery of due) {
    await dispatchDelivery(delivery, dispatchContext);
  }

  const cleanup = await cleanupObsoleteDeliveries({
    now,
    config,
    logger,
    channel,
  });
  summary.cancelledDeliveries += cleanup.cancelled;
  summary.missed += cleanup.missed;
  summary.unknown += cleanup.unknown;

  if (
    summary.createdDeliveries > 0 ||
    summary.sent > 0 ||
    summary.retried > 0 ||
    summary.failed > 0 ||
    summary.unknown > 0 ||
    summary.cancelledDeliveries > 0 ||
    summary.missed > 0
  ) {
    logger.info("Meeting reminder cycle completed", { ...summary, channel });
  }

  return summary;
}

export function reminderRecipientUserIds(meeting: Meeting): string[] {
  return meetingReminderUserIds(meeting).map((id) => id.toString());
}

export { classifyProviderFailure as classifyReminderFailure } from "./meeting-reminder.channel.js";
