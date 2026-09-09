import { z } from "zod";

const emptyableBilingualTextSchema = z.object({
  en: z.string().trim().max(10000).default(""),
  id: z.string().trim().max(10000).default(""),
});

const requiredBilingualTextSchema = z.object({
  en: z.string().trim().min(1).max(500),
  id: z.string().trim().min(1).max(500),
});

const optionalBilingualTextSchema = z.object({
  en: z.string().trim().max(500).default(""),
  id: z.string().trim().max(500).default(""),
});

const peopleRefSchema = z.object({
  kind: z.enum(["DOSEN", "STUDENT", "ALUMNI"]),
  id: z.string().regex(/^[a-f\d]{24}$/i, "Invalid People ID"),
});

const itemIdSchema = z
  .string()
  .trim()
  .regex(/^[a-z0-9-]+$/i)
  .max(80)
  .optional();

const serviceCompanySchema = z.object({
  id: itemIdSchema,
  name: z.string().trim().min(1).max(200),
  description: emptyableBilingualTextSchema.optional(),
  order: z.number().int().min(0).max(100000).default(0),
  published: z.boolean().default(true),
});

const serviceJobSchema = z.object({
  id: itemIdSchema,
  name: requiredBilingualTextSchema,
  description: emptyableBilingualTextSchema.optional(),
  order: z.number().int().min(0).max(100000).default(0),
  published: z.boolean().default(true),
});

const expertFields = {
  peopleRef: peopleRefSchema,
  displayName: z.string().trim().min(1).max(250).optional(),
  expertise: emptyableBilingualTextSchema.optional(),
  order: z.number().int().min(0).max(100000).default(0),
  published: z.boolean().default(false),
};

export const createPublicServiceExpertSchema = z.object(expertFields);
export const updatePublicServiceExpertSchema = z.object({
  peopleRef: expertFields.peopleRef.optional(),
  displayName: expertFields.displayName.optional(),
  expertise: expertFields.expertise,
  order: expertFields.order.optional(),
  published: z.boolean().optional(),
});

const serviceFields = {
  code: z.string().trim().min(1).max(50).optional(),
  title: optionalBilingualTextSchema,
  description: emptyableBilingualTextSchema.optional(),
  shortDescription: emptyableBilingualTextSchema.optional(),
  detailedDescription: emptyableBilingualTextSchema.optional(),
  images: z.array(z.string().trim().max(500)).max(20).default([]),
  companies: z.array(serviceCompanySchema).max(100).default([]),
  jobs: z.array(serviceJobSchema).max(100).default([]),
  order: z.number().int().min(0).max(100000).default(0),
  published: z.boolean().default(false),
};

export const createPublicServiceSchema = z.object(serviceFields);
export const updatePublicServiceSchema = z.object({
  code: serviceFields.code,
  title: serviceFields.title,
  description: serviceFields.description,
  shortDescription: serviceFields.shortDescription,
  detailedDescription: serviceFields.detailedDescription,
  images: serviceFields.images.optional(),
  companies: serviceFields.companies.optional(),
  jobs: serviceFields.jobs.optional(),
  order: serviceFields.order.optional(),
  published: z.boolean().optional(),
});

export type CreatePublicServiceExpertInput = z.infer<
  typeof createPublicServiceExpertSchema
>;
export type UpdatePublicServiceExpertInput = z.infer<
  typeof updatePublicServiceExpertSchema
>;
export type CreatePublicServiceInput = z.infer<
  typeof createPublicServiceSchema
>;
export type UpdatePublicServiceInput = z.infer<
  typeof updatePublicServiceSchema
>;
