import { z } from "zod";

export const createDosenSchema = z.object({
  userId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid user ID"),

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
    .max(50)
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
  z.object({
    fullName: z.string().trim().min(2).optional(),
    employeeId: z.string().trim().min(1).optional(),
    title: z.string().trim().max(100).optional(),
    position: z.string().trim().max(150).optional(),
    specialization: z.array(z.string().trim().min(1)).max(50).optional(),
    email: z.string().trim().email().optional(),
    phone: z.string().trim().max(50).optional(),
    photo: z.string().trim().max(500).optional(),
    bio: z.string().trim().max(2000).optional(),
    linkedin: z.string().url().optional(),
    isPublic: z.boolean().optional(),
  });

export type CreateDosenInput =
  z.infer<typeof createDosenSchema>;

export type UpdateDosenInput =
  z.infer<typeof updateDosenSchema>;
