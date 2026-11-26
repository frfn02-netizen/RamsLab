import { z } from "zod";
import { USER_ROLES } from "./user.types.js";

export const createInternalAccountSchema = z.object({
  fullName: z.string().trim().min(2, "Full name is required").max(200),
  email: z.string().trim().email("Invalid email address").toLowerCase(),
  role: z.enum([USER_ROLES.ADMIN, USER_ROLES.DOSEN]),
});

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
