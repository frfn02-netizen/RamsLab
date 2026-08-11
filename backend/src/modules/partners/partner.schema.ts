import { z } from "zod";

import { PARTNER_TYPE } from "./partner.types.js";

export const createPartnerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Partner name is required"),

  type: z.enum([
    PARTNER_TYPE.UNIVERSITY,
    PARTNER_TYPE.INDUSTRIAL,
  ]),

  logo: z
    .string()
    .trim()
    .optional(),

  website: z
    .string()
    .url()
    .optional(),

  country: z
    .string()
    .trim()
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

export const updatePartnerSchema =
  createPartnerSchema.partial();

export type CreatePartnerInput =
  z.infer<typeof createPartnerSchema>;

export type UpdatePartnerInput =
  z.infer<typeof updatePartnerSchema>;