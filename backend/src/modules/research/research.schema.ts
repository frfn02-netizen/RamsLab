import { z } from "zod";

const bilingualTextSchema = z.object({
  en: z.string().trim().min(1).max(5000),
  id: z.string().trim().min(1).max(5000),
});

const researchAreaFields = {
  code: z
    .string()
    .trim()
    .regex(/^[A-Z][A-Z0-9_]*$/, "Code must be an uppercase identifier")
    .max(50),
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be URL-safe")
    .max(100),
  title: bilingualTextSchema,
  description: bilingualTextSchema,
  downloadablePng: z.string().trim().max(500).optional(),
  order: z.number().int().min(0).max(100000),
  published: z.boolean().default(true),
};

export const createResearchAreaSchema = z.object(researchAreaFields);

export const updateResearchAreaSchema = z.object({
  code: researchAreaFields.code.optional(),
  slug: researchAreaFields.slug.optional(),
  title: researchAreaFields.title.optional(),
  description: researchAreaFields.description.optional(),
  downloadablePng: researchAreaFields.downloadablePng,
  order: researchAreaFields.order.optional(),
  published: z.boolean().optional(),
});

export type CreateResearchAreaInput = z.infer<typeof createResearchAreaSchema>;
export type UpdateResearchAreaInput = z.infer<typeof updateResearchAreaSchema>;
