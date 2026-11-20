import type { Request, Response } from "express";
import { publicScheduleQuerySchema } from "./public-schedule.schema.js";
import {
  findPublicScheduleMeetingById,
  findPublicScheduleMeetings,
} from "./public-schedule.repository.js";
import { toPublicScheduleMeeting } from "./public-schedule.serializer.js";
import { findUsersByIds } from "../users/user.repository.js";
import type { Meeting } from "../meetings/meeting.types.js";

async function publicPicUsers(meetings: Meeting[]) {
  const ids = new Map<string, Meeting["primaryPicId"]>();
  for (const meeting of meetings) {
    for (const id of [meeting.primaryPicId, ...(meeting.picIds ?? [])]) {
      if (id) ids.set(id.toString(), id);
    }
  }
  const entries = await findUsersByIds([...ids.values()].filter(Boolean) as NonNullable<Meeting["primaryPicId"]>[]);
  return new Map(entries.map((entry) => [entry._id?.toString() ?? "", entry]));
}

export async function getPublicScheduleController(req: Request, res: Response) {
  const parsed = publicScheduleQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid schedule query" });
  }

  try {
    const { items, total } = await findPublicScheduleMeetings(parsed.data);
    const users = await publicPicUsers(items);
    const totalPages = Math.ceil(total / parsed.data.limit);
    return res.json({
      success: true,
      data: items.map((meeting) => toPublicScheduleMeeting(meeting, users)),
      total,
      page: parsed.data.page,
      limit: parsed.data.limit,
      totalPages,
      hasMore: parsed.data.page < totalPages,
    });
  } catch {
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch public schedule" });
  }
}

export async function getPublicScheduleByIdController(
  req: Request,
  res: Response,
) {
  try {
    const meeting = await findPublicScheduleMeetingById(req.params.id as string);
    if (!meeting) {
      return res
        .status(404)
        .json({ success: false, message: "Public schedule not found" });
    }
    const users = await publicPicUsers([meeting]);
    return res.json({
      success: true,
      data: toPublicScheduleMeeting(meeting, users),
    });
  } catch {
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch public schedule" });
  }
}
