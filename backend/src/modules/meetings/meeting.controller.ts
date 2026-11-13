import type { Request, Response } from "express";
import { ZodError } from "zod";
import { HttpError } from "../../middlewares/error.middleware.js";
import { normalizeAttachmentFilename } from "../../lib/cloudinary.js";
import {
  conflictCheckSchema,
  createMeetingSchema,
  MEETING_ATTACHMENT_EXTENSION,
  MEETING_ATTACHMENT_MIME_TYPES,
  MAX_MEETING_ATTACHMENT_BYTES,
  updateMeetingSchema,
} from "./meeting.schema.js";
import {
  addAttachment,
  checkConflicts,
  createMeeting,
  deleteMeeting,
  getMeeting,
  getMeetings,
  removeAttachment,
  updateMeeting,
} from "./meeting.service.js";

function fail(res: Response, error: unknown, fallback: string) {
  if (error instanceof ZodError) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: error.issues,
    });
  }
  if (error instanceof HttpError) {
    return res.status(error.statusCode).json({
      success: false,
      message: error.message,
    });
  }
  return res.status(500).json({ success: false, message: fallback });
}

function parseOptionalDate(value: unknown): Date | undefined {
  if (value === undefined || value === "") return undefined;
  if (typeof value !== "string") {
    throw new HttpError(400, "Invalid date range");
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new HttpError(400, "Invalid date range");
  }
  return date;
}

export async function getMeetingListController(req: Request, res: Response) {
  try {
    const meetings = await getMeetings(req.user!, {
      from: parseOptionalDate(req.query.from),
      to: parseOptionalDate(req.query.to),
    });
    return res.json({ success: true, data: meetings });
  } catch (error) {
    return fail(res, error, "Failed to fetch meetings");
  }
}

export async function getMeetingController(req: Request, res: Response) {
  try {
    const meeting = await getMeeting(req.params.id as string, req.user!);
    return res.json({ success: true, data: meeting });
  } catch (error) {
    return fail(res, error, "Failed to fetch meeting");
  }
}

export async function createMeetingController(req: Request, res: Response) {
  try {
    const input = createMeetingSchema.parse(req.body);
    const result = await createMeeting(input, req.user!);
    return res.status(201).json({ success: true, data: result });
  } catch (error) {
    return fail(res, error, "Failed to create meeting");
  }
}

export async function updateMeetingController(req: Request, res: Response) {
  try {
    const input = updateMeetingSchema.parse(req.body);
    const result = await updateMeeting(
      req.params.id as string,
      input,
      req.user!,
    );
    return res.json({ success: true, data: result });
  } catch (error) {
    return fail(res, error, "Failed to update meeting");
  }
}

export async function deleteMeetingController(req: Request, res: Response) {
  try {
    await deleteMeeting(req.params.id as string, req.user!);
    return res.json({ success: true, message: "Meeting deleted successfully" });
  } catch (error) {
    return fail(res, error, "Failed to delete meeting");
  }
}

export async function checkConflictsController(req: Request, res: Response) {
  try {
    const input = conflictCheckSchema.parse(req.body);
    const conflicts = await checkConflicts(input, req.user!);
    return res.json({ success: true, data: conflicts });
  } catch (error) {
    return fail(res, error, "Failed to check meeting conflicts");
  }
}

export async function uploadAttachmentController(req: Request, res: Response) {
  try {
    const id = req.params.id as string;
    const contentType = (req.headers["content-type"] ?? "")
      .split(";", 1)[0]
      .trim()
      .toLowerCase();
    const buffer = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);

    if (!MEETING_ATTACHMENT_MIME_TYPES.has(contentType)) {
      throw new HttpError(
        415,
        "Only PDF, PowerPoint, and Word documents are supported",
      );
    }
    if (!buffer.length || buffer.length > MAX_MEETING_ATTACHMENT_BYTES) {
      throw new HttpError(413, "File must be between 1 byte and 20 MB");
    }

    const headerValue = req.headers["x-original-filename"];
    const rawFilename =
      typeof headerValue === "string" && headerValue.trim()
        ? headerValue
        : `attachment-${Date.now()}`;
    const filename = normalizeAttachmentFilename(rawFilename);
    if (!MEETING_ATTACHMENT_EXTENSION.test(filename)) {
      throw new HttpError(
        400,
        "Filename must end with .pdf, .ppt, .pptx, .doc, or .docx",
      );
    }

    const meeting = await addAttachment(id, req.user!, {
      buffer,
      mimeType: contentType,
      originalFilename: filename,
      size: buffer.length,
    });
    return res.status(201).json({ success: true, data: meeting });
  } catch (error) {
    return fail(res, error, "Failed to upload attachment");
  }
}

export async function deleteAttachmentController(req: Request, res: Response) {
  try {
    const meeting = await removeAttachment(
      req.params.id as string,
      req.params.attachmentId as string,
      req.user!,
    );
    return res.json({ success: true, data: meeting });
  } catch (error) {
    return fail(res, error, "Failed to remove attachment");
  }
}
