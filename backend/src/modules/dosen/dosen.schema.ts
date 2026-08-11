import { z } from "zod";

export const createDosenSchema = z.object({
  userId: z.string().min(1),

  fullName: z
    .string()
    .trim()
    .min(2, "Full name is required"),

  employeeId: z
    .string()
    .trim()
    .optional(),

  title: z
    .string()
    .trim()
    .optional(),

  position: z
    .string()
    .trim()
    .optional(),

  specialization: z
    .array(
      z
        .string()
        .trim()
        .min(1)
    )
    .default([]),

  email: z
    .string()
    .trim()
    .email()
    .optional(),

  phone: z
    .string()
    .trim()
    .optional(),

  photo: z
    .string()
    .trim()
    .optional(),

  bio: z
    .string()
    .trim()
    .max(2000)
    .optional(),

  linkedin: z
    .string()
    .url()
    .optional(),

  isPublic: z
    .boolean()
    .default(true),
});

export const updateDosenSchema =
  createDosenSchema
    .omit({
      userId: true,
    })
    .partial();

export type CreateDosenInput =
  z.infer<typeof createDosenSchema>;

export type UpdateDosenInput =
  z.infer<typeof updateDosenSchema>;