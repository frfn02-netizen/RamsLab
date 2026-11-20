import { z } from "zod";
import { isSafeHttpUrl } from "../../lib/url-security.js";
import {
  MEETING_MODES,
  MEETING_VISIBILITIES,
} from "./meeting.types.js";

export const MAX_MEETING_ATTACHMENTS = 10;
export const MAX_MEETING_ATTACHMENT_BYTES = 20 * 1024 * 1024;
export const MEETING_ATTACHMENT_EXTENSION = /\.(pdf|ppt|pptx|doc|docx)$/i;
export const MEETING_ATTACHMENT_MIME_TYPES = new Set([
  "application/pdf",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const objectId = z
  .string()
  .trim()
  .regex(/^[a-f\d]{24}$/i, "Invalid user id");

const meetingLink = z
  .string()
  .trim()
  .url("Meeting link must be a valid URL")
  .refine(isSafeHttpUrl, "Meeting link must use HTTP or HTTPS")
  .max(1000)
  .nullable()
  .optional();

const meetingVisibility = z.enum(MEETING_VISIBILITIES);
const meetingMode = z.enum(MEETING_MODES);
const clientName = z
  .string()
  .trim()
  .min(1, "Client name is required")
  .max(200, "Client name is too long");
const location = z
  .string()
  .trim()
  .max(300, "Location is too long")
  .nullable()
  .optional();

const meetingFields = {
  title: z.string().trim().min(1, "Title is required").max(200),
  description: z.string().trim().max(5000).default(""),
  clientName,
  mode: meetingMode,
  location,
  startAt: z.coerce.date(),
  endAt: z.coerce.date(),
  visibility: meetingVisibility.default("INTERNAL"),
  primaryPicId: objectId,
  picIds: z.array(objectId).min(1).max(10),
  participantIds: z.array(objectId).max(100).default([]),
  meetingLink,
};

export const createMeetingSchema = z
  .object(meetingFields)
  .superRefine((meeting, context) => {
    if (meeting.mode === "OFFLINE" && !meeting.location?.trim()) {
      context.addIssue({
        code: "custom",
        path: ["location"],
        message: "A physical location is required for offline meetings",
      });
    }
    if (meeting.mode === "ONLINE" && !meeting.meetingLink) {
      context.addIssue({
        code: "custom",
        path: ["meetingLink"],
        message: "A meeting URL is required for online meetings",
      });
    }
    if (!meeting.picIds.includes(meeting.primaryPicId)) {
      context.addIssue({
        code: "custom",
        path: ["picIds"],
        message: "Primary PIC must be included in the PIC list",
      });
    }
    const uniquePicIds = new Set(meeting.picIds);
    if (uniquePicIds.size !== meeting.picIds.length) {
      context.addIssue({
        code: "custom",
        path: ["picIds"],
        message: "PIC list contains duplicate IDs",
      });
    }
  });

export const updateMeetingSchema = z.object({
  expectedUpdatedAt: z.coerce.date().optional(),
  title: meetingFields.title.optional(),
  description: z.string().trim().max(5000).optional(),
  clientName: clientName.optional(),
  mode: meetingMode.optional(),
  location,
  startAt: z.coerce.date().optional(),
  endAt: z.coerce.date().optional(),
  visibility: meetingVisibility.optional(),
  primaryPicId: objectId.optional(),
  picIds: z.array(objectId).min(1).max(10).optional(),
  participantIds: z.array(objectId).max(100).optional(),
  meetingLink,
}).superRefine((meeting, context) => {
  if (meeting.primaryPicId && meeting.picIds && !meeting.picIds.includes(meeting.primaryPicId)) {
    context.addIssue({
      code: "custom",
      path: ["picIds"],
      message: "Primary PIC must be included in the PIC list",
    });
  }
  if (meeting.picIds) {
    const uniquePicIds = new Set(meeting.picIds);
    if (uniquePicIds.size !== meeting.picIds.length) {
      context.addIssue({
        code: "custom",
        path: ["picIds"],
        message: "PIC list contains duplicate IDs",
      });
    }
  }
});

export const cancelMeetingSchema = z.object({
  reason: z.string().trim().max(1000).optional(),
});

export const conflictCheckSchema = z.object({
  startAt: z.coerce.date(),
  endAt: z.coerce.date(),
  picIds: z.array(objectId).max(10).default([]),
  participantIds: z.array(objectId).max(100).default([]),
  excludeId: objectId.optional(),
}).superRefine((meeting, context) => {
  const uniquePicIds = new Set(meeting.picIds);
  if (uniquePicIds.size !== meeting.picIds.length) {
    context.addIssue({
      code: "custom",
      path: ["picIds"],
      message: "PIC list contains duplicate IDs",
    });
  }
});

export type CreateMeetingInput = z.infer<typeof createMeetingSchema>;
export type UpdateMeetingInput = z.infer<typeof updateMeetingSchema>;
export type CancelMeetingInput = z.infer<typeof cancelMeetingSchema>;
export type ConflictCheckInput = z.infer<typeof conflictCheckSchema>;
