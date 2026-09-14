import { z } from "zod";
import { extractYouTubeVideoId } from "./video.youtube.js";

const optionalText = (max = 500) =>
  z
    .string()
    .trim()
    .max(max)
    .nullable()
    .optional()
    .transform((value) => value || null);

const youtubeUrlField = z
  .string()
  .trim()
  .min(1, "YouTube URL is required")
  .max(1000)
  .refine(
    (value) => extractYouTubeVideoId(value) !== null,
    "Please enter a valid YouTube URL",
  );

export const createVideoSchema = z.object({
  youtubeUrl: youtubeUrlField,
  title: optionalText(500),
  thumbnailUrl: z
    .string()
    .trim()
    .url("Thumbnail URL must be a valid URL")
    .max(1000)
    .nullable()
    .optional()
    .transform((value) => value || null),
  isFeatured: z.boolean().default(false),
  order: z.number().int().min(0).max(100000).default(0),
  published: z.boolean().default(false),
});

export const updateVideoSchema = z.object({
  youtubeUrl: youtubeUrlField.optional(),
  title: optionalText(500),
  thumbnailUrl: z
    .string()
    .trim()
    .url("Thumbnail URL must be a valid URL")
    .max(1000)
    .nullable()
    .optional()
    .transform((value) => value || null),
  isFeatured: z.boolean().optional(),
  order: z.number().int().min(0).max(100000).optional(),
  published: z.boolean().optional(),
});

export type CreateVideoInput = z.infer<typeof createVideoSchema>;
export type UpdateVideoInput = z.infer<typeof updateVideoSchema>;
