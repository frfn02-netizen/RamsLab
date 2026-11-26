import type { Request, Response } from "express";

import { readMeetingReminderConfig } from "../../config/meeting-reminders.js";
import { runMeetingReminderCycle } from "./meeting-reminder.service.js";

function validCronAuthorization(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  const authorization = request.get("authorization");
  return Boolean(
    secret && authorization && authorization === `Bearer ${secret}`,
  );
}

export async function runMeetingReminderCron() {
  const config = readMeetingReminderConfig();
  return runMeetingReminderCycle({ config, logger: console });
}

export async function meetingReminderCronController(
  req: Request,
  res: Response,
) {
  res.setHeader("Cache-Control", "no-store");
  if (!validCronAuthorization(req)) {
    return res.status(401).json({
      success: false,
      message: "Invalid cron authorization",
    });
  }

  try {
    const summary = await runMeetingReminderCron();
    return res.json({ success: true, data: summary });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Meeting reminder cron failed",
    });
  }
}
