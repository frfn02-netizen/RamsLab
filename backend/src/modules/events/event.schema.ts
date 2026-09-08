import { z } from "zod";
import { isSafeHttpUrl } from "../../lib/url-security.js";

const optionalBilingualTextSchema = z.object({
  en: z.string().trim().max(5000).default(""),
  id: z.string().trim().max(5000).default(""),
});

const requiredBilingualTextSchema = z.object({
  en: z.string().trim().min(1).max(500),
  id: z.string().trim().min(1).max(500),
});

const eventImageSchema = z.object({
  url: z.string().trim().url().refine(isSafeHttpUrl).max(500),
  publicId: z.string().trim().max(200).optional(),
  alt: optionalBilingualTextSchema.optional(),
});

const eventFields = {
  title: requiredBilingualTextSchema,
  description: optionalBilingualTextSchema.optional(),
  image: eventImageSchema.optional(),
  eventDate: z.coerce.date().nullable().optional(),
  location: optionalBilingualTextSchema.optional(),
  order: z.number().int().min(0).max(100000).default(0),
  published: z.boolean().default(false),
};

export const createEventSchema = z.object(eventFields);

export const updateEventSchema = z.object({
  title: eventFields.title.optional(),
  description: eventFields.description,
  image: eventFields.image,
  eventDate: eventFields.eventDate,
  location: eventFields.location,
  order: eventFields.order.optional(),
  published: z.boolean().optional(),
});

export type CreateEventInput = z.infer<typeof createEventSchema>;
export type UpdateEventInput = z.infer<typeof updateEventSchema>;
