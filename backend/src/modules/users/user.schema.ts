import { z } from "zod";

export const updateNotificationPreferencesSchema = z
  .object({
    whatsappNumber: z.string().max(40).nullable().optional(),
    whatsappOptIn: z.boolean().optional(),
  })
  .refine(
    (value) =>
      value.whatsappNumber !== undefined || value.whatsappOptIn !== undefined,
    {
      message: "At least one preference field is required",
      path: ["whatsappNumber"],
    },
  );
