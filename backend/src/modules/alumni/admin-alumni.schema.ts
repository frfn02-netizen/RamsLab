import { z } from "zod";

import { ALUMNI_STATUS } from "./alumni.types.js";

export const createAdminAlumniSchema = z.object({
  email: z
    .string()
    .trim()
    .email("Invalid email"),

  password: z
    .string()
    .min(8, "Password must be at least 8 characters"),

  fullName: z
    .string()
    .trim()
    .min(2, "Full name is required"),

  nim: z
    .string()
    .trim()
    .min(1, "NIM is required"),

  graduationYear: z
    .number()
    .int()
    .min(1900)
    .max(2100),

  program: z
    .string()
    .trim()
    .min(1, "Program is required"),

  phone: z
    .string()
    .trim()
    .optional(),

  location: z
    .string()
    .trim()
    .optional(),

  currentStatus: z.enum([
    ALUMNI_STATUS.WORKING,
    ALUMNI_STATUS.STUDYING,
    ALUMNI_STATUS.ENTREPRENEUR,
    ALUMNI_STATUS.SEEKING_JOB,
    ALUMNI_STATUS.OTHER,
  ]),

  currentCompany: z
    .string()
    .trim()
    .optional(),

  currentPosition: z
    .string()
    .trim()
    .optional(),

  linkedin: z
    .string()
    .url()
    .optional(),

  bio: z
    .string()
    .trim()
    .max(1000)
    .optional(),

  isPublic: z
    .boolean()
    .default(false),
});

export type CreateAdminAlumniInput =
  z.infer<typeof createAdminAlumniSchema>;