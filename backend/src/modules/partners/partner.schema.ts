import { z } from "zod";

import { PARTNER_TYPE } from "./partner.types.js";

export const createPartnerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Partner name is required")
    .max(200),

  type: z.enum([
    PARTNER_TYPE.UNIVERSITY,
    PARTNER_TYPE.INDUSTRIAL,
  ]),

  logo: z
    .string()
    .trim()
    .max(500)
    .optional(),

  website: z
    .string()
    .url()
    .optional(),

  country: z
    .string()
    .trim()
    .max(100)
    .optional(),

  description: z
    .string()
    .trim()
    .max(1000)
    .optional(),

  isFeatured: z
    .boolean()
    .default(false),

  published: z
    .boolean()
    .default(false),
});

export const createPartnerDetailsSchema = createPartnerSchema.omit({ type: true });

export const updatePartnerSchema = z.object({
  name: z.string().trim().min(2).max(200).optional(),
  logo: z.string().trim().max(500).optional(),
  website: z.string().url().optional(),
  country: z.string().trim().max(100).optional(),
  description: z.string().trim().max(1000).optional(),
  isFeatured: z.boolean().optional(),
  published: z.boolean().optional(),
});

export type CreatePartnerInput =
  z.infer<typeof createPartnerSchema>;

export type UpdatePartnerInput =
  z.infer<typeof updatePartnerSchema>;
