import { z } from "zod";
import { isSafeHttpUrl } from "../../lib/url-security.js";

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

const meetingFields = {
  title: z.string().trim().min(1, "Title is required").max(200),
  description: z.string().trim().max(5000).default(""),
  startAt: z.coerce.date(),
  endAt: z.coerce.date(),
  participantIds: z.array(objectId).max(100).default([]),
  meetingLink,
};

export const createMeetingSchema = z.object(meetingFields);

export const updateMeetingSchema = z.object({
  title: meetingFields.title.optional(),
  description: z.string().trim().max(5000).optional(),
  startAt: z.coerce.date().optional(),
  endAt: z.coerce.date().optional(),
  participantIds: z.array(objectId).max(100).optional(),
  meetingLink,
});

export const conflictCheckSchema = z.object({
  startAt: z.coerce.date(),
  endAt: z.coerce.date(),
  participantIds: z.array(objectId).max(100).default([]),
  excludeId: objectId.optional(),
});

export type CreateMeetingInput = z.infer<typeof createMeetingSchema>;
export type UpdateMeetingInput = z.infer<typeof updateMeetingSchema>;
export type ConflictCheckInput = z.infer<typeof conflictCheckSchema>;
