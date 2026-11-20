import {
  readMeetingReminderConfig,
  type MeetingReminderRuntimeConfig,
} from "../../config/meeting-reminders.js";
import {
  createMeetingReminderInstanceId,
  runMeetingReminderCycle,
  type MeetingReminderLogger,
} from "./meeting-reminder.service.js";
import type { MeetingReminderCycleSummary } from "./meeting-reminder.types.js";

export interface MeetingReminderSchedulerHandle {
  stop(timeoutMs?: number): Promise<void>;
  isRunning(): boolean;
}

export interface StartMeetingReminderSchedulerOptions {
  config?: MeetingReminderRuntimeConfig;
  logger?: MeetingReminderLogger;
  runCycle?: (
    config: MeetingReminderRuntimeConfig,
    instanceId: string,
  ) => Promise<MeetingReminderCycleSummary>;
}

const DEFAULT_DRAIN_TIMEOUT_MS = 30_000;

export function startMeetingReminderScheduler(
  options: StartMeetingReminderSchedulerOptions = {},
): MeetingReminderSchedulerHandle {
  const logger = options.logger ?? console;
  let config: MeetingReminderRuntimeConfig;

  try {
    config = options.config ?? readMeetingReminderConfig();
  } catch (error) {
    logger.error("Meeting reminder scheduler configuration is invalid", {
      error: error instanceof Error ? error.message : "unknown error",
    });
    return {
      async stop() {},
      isRunning: () => false,
    };
  }

  if (!config.enabled) {
    logger.info("Meeting reminder scheduler disabled");
    return {
      async stop() {},
      isRunning: () => false,
    };
  }

  const instanceId = createMeetingReminderInstanceId();
  const runCycle =
    options.runCycle ??
    ((runtimeConfig, runtimeInstanceId) =>
      runMeetingReminderCycle({
        config: runtimeConfig,
        instanceId: runtimeInstanceId,
        logger,
      }));

  let timer: NodeJS.Timeout | null = null;
  let inFlight: Promise<void> | null = null;
  let stopping = false;

  const tick = async () => {
    if (stopping || inFlight) return;

    inFlight = (async () => {
      try {
        await runCycle(config, instanceId);
      } catch (error) {
        logger.error("Meeting reminder scheduler cycle failed", {
          error: error instanceof Error ? error.message : "unknown error",
        });
      }
    })();

    try {
      await inFlight;
    } finally {
      inFlight = null;
    }
  };

  void tick();
  timer = setInterval(() => {
    void tick();
  }, config.pollMs);
  timer.unref?.();

  logger.info("Meeting reminder scheduler started", {
    pollMs: config.pollMs,
    timezone: config.timezone,
    maxAttempts: config.maxAttempts,
  });

  return {
    isRunning: () => inFlight !== null,
    async stop(timeoutMs = DEFAULT_DRAIN_TIMEOUT_MS) {
      if (stopping) {
        await waitForDrain(inFlight, timeoutMs);
        return;
      }

      stopping = true;
      if (timer) {
        clearInterval(timer);
        timer = null;
      }

      await waitForDrain(inFlight, timeoutMs);
    },
  };
}

async function waitForDrain(
  inFlight: Promise<void> | null,
  timeoutMs: number,
): Promise<void> {
  if (!inFlight) return;

  let timeout: NodeJS.Timeout | null = null;
  try {
    await Promise.race([
      inFlight.catch(() => undefined),
      new Promise<void>((resolve) => {
        timeout = setTimeout(resolve, Math.max(0, timeoutMs));
        timeout.unref?.();
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}
