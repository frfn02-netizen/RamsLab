import { z } from "zod";
import { isSafeHttpUrl } from "../../lib/url-security.js";

const currentYear = new Date().getFullYear();
const publicationYear = z.number().int().min(1900).max(currentYear + 1);
const text = (message: string, max = 500) => z.string().trim().min(1, message).max(max);
const publicationType = text("Publication type is required", 100);
const optionalText = (max = 500) => z.string().trim().max(max).nullable().optional().transform((value) => value || null);
const list = z.array(z.string().trim().min(1).max(200)).max(50).default([]);

export const createPublicationSchema = z.object({
  title: text("Publication title is required", 500),
  authors: z.array(z.string().trim().min(1, "Author name is required").max(200)).min(1, "At least one author is required").max(100),
  publicationType,
  year: publicationYear,
  journal: text("Journal is required", 300),
  doi: optionalText(255),
  pdfUrl: z.string().trim().url("PDF URL must be a valid URL").refine(isSafeHttpUrl, "PDF URL must use HTTP or HTTPS").max(1000).nullable().optional().transform((value) => value || null),
  topics: list,
  methods: list,
});

export const updatePublicationSchema = createPublicationSchema.partial();

export type CreatePublicationInput = z.infer<typeof createPublicationSchema>;
export type UpdatePublicationInput = z.infer<typeof updatePublicationSchema>;
