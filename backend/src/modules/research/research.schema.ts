import { z } from "zod";

const bilingualTextSchema = z.object({
  en: z.string().trim().min(1).max(5000),
  id: z.string().trim().min(1).max(5000),
});

export const imageLayoutSchema = z.object({
  imageLayout: z.enum(["preset", "custom"]).default("preset"),
  imagePreset: z.enum(["landscape", "wide", "portrait", "square"]).default("portrait"),
  gridColumns: z.number().int().min(3).max(8).default(4),
  gridRows: z.number().int().min(2).max(6).default(3),
  imageFit: z.enum(["cover", "contain"]).default("cover"),
  imagePosition: z
    .enum(["center", "top", "bottom", "left", "right"])
    .default("center"),
});

export const cropSettingsSchema = z.object({
  cropAspectRatio: z.enum(["4/3", "16/9", "1/1", "3/4", "9/16", "custom"]).default("4/3"),
  cropPositionX: z.number().min(0).max(100).default(50),
  cropPositionY: z.number().min(0).max(100).default(50),
  cropScale: z.number().min(0.5).max(3).default(1),
  customWidth: z.number().int().min(100).max(4000).optional(),
  customHeight: z.number().int().min(100).max(4000).optional(),
});

export type ImageLayoutInput = z.infer<typeof imageLayoutSchema>;
export type CropSettingsInput = z.infer<typeof cropSettingsSchema>;

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
  imageLayout: imageLayoutSchema.shape.imageLayout.optional(),
  imagePreset: imageLayoutSchema.shape.imagePreset.optional(),
  gridColumns: imageLayoutSchema.shape.gridColumns.optional(),
  gridRows: imageLayoutSchema.shape.gridRows.optional(),
  imageFit: imageLayoutSchema.shape.imageFit.optional(),
  imagePosition: imageLayoutSchema.shape.imagePosition.optional(),
  cropAspectRatio: cropSettingsSchema.shape.cropAspectRatio.optional(),
  cropPositionX: cropSettingsSchema.shape.cropPositionX.optional(),
  cropPositionY: cropSettingsSchema.shape.cropPositionY.optional(),
  cropScale: cropSettingsSchema.shape.cropScale.optional(),
  customWidth: cropSettingsSchema.shape.customWidth,
  customHeight: cropSettingsSchema.shape.customHeight,
  order: researchAreaFields.order.optional(),
  published: z.boolean().optional(),
});

export type CreateResearchAreaInput = z.infer<typeof createResearchAreaSchema>;
export type UpdateResearchAreaInput = z.infer<typeof updateResearchAreaSchema>;
