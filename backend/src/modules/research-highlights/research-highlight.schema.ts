import { z } from "zod";
import { isSafeHttpUrl } from "../../lib/url-security.js";

const bilingualTextSchema = z.object({
  en: z.string().trim().min(1, "English headline is required").max(5000),
  id: z.string().trim().min(1, "Indonesian headline is required").max(5000),
});

const imageSchema = z.object({
  url: z
    .string()
    .trim()
    .url("Image URL must be a valid URL")
    .refine(isSafeHttpUrl, "Image URL must use HTTP or HTTPS")
    .max(1000),
  publicId: z.string().trim().max(500).optional(),
});

const publicationId = z
  .string()
  .trim()
  .refine((value) => /^[a-f\d]{24}$/i.test(value), "Invalid publication ID");

export const createResearchHighlightSchema = z.object({
  headline: bilingualTextSchema,
  publicationId,
  image: imageSchema.optional(),
  order: z.number().int().min(0),
  published: z.boolean().default(true),
});

export const updateResearchHighlightSchema = z.object({
  headline: bilingualTextSchema.optional(),
  publicationId: publicationId.optional(),
  image: imageSchema.optional(),
  order: z.number().int().min(0).optional(),
  published: z.boolean().optional(),
});

export type CreateResearchHighlightInput = z.infer<
  typeof createResearchHighlightSchema
>;
export type UpdateResearchHighlightInput = z.infer<
  typeof updateResearchHighlightSchema
>;
