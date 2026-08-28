import { z } from "zod";
import { ALUMNI_STATUS } from "./alumni.types.js";
import { isSafeLinkedInUrl } from "../../lib/url-security.js";

const careerHistorySchema = z.object({
  company: z
    .string()
    .trim()
    .min(1, "Company is required")
    .max(200),

  position: z
    .string()
    .trim()
    .min(1, "Position is required")
    .max(200),

  startDate: z.coerce.date(),

  endDate: z
    .coerce
    .date()
    .nullable(),

  location: z
    .string()
    .trim()
    .max(200)
    .optional(),
});

const educationHistorySchema = z.object({
  institution: z
    .string()
    .trim()
    .min(1, "Institution is required")
    .max(200),

  degree: z
    .string()
    .trim()
    .min(1, "Degree is required")
    .max(200),

  fieldOfStudy: z
    .string()
    .trim()
    .min(1, "Field of study is required")
    .max(200),

  startYear: z
    .number()
    .int()
    .min(1900)
    .max(2100),

  endYear: z
    .number()
    .int()
    .min(1900)
    .max(2100)
    .nullable(),
});


// ========================================
// CREATE
// ========================================

export const createAlumniSchema = z.object({
  userId: z
    .string()
    .regex(/^[a-f\d]{24}$/i, "Invalid user ID"),

  fullName: z
    .string()
    .trim()
    .min(2, "Full name is required")
    .max(200),

  nim: z
    .string()
    .trim()
    .min(1, "NIM is required")
    .max(50),

  photo: z
    .string()
    .trim()
    .optional(),

  graduationYear: z
    .number()
    .int()
    .min(1900)
    .max(2100),

  program: z
    .string()
    .trim()
    .min(1, "Program is required")
    .max(200),

  phone: z
    .string()
    .trim()
    .max(50)
    .optional(),

  location: z
    .string()
    .trim()
    .max(200)
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
    .max(200)
    .optional(),

  currentPosition: z
    .string()
    .trim()
    .max(200)
    .optional(),

  linkedin: z
    .string()
    .url()
    .refine(isSafeLinkedInUrl, "LinkedIn URL must use a LinkedIn domain")
    .optional(),

  bio: z
    .string()
    .trim()
    .max(1000)
    .optional(),

  careerHistory: z
    .array(careerHistorySchema)
    .max(50)
    .default([]),

  educationHistory: z
    .array(educationHistorySchema)
    .max(50)
    .default([]),

  isPublic: z
    .boolean()
    .default(false),
});


// ========================================
// ADMIN UPDATE
// ========================================
//
// Immutable fields are intentionally excluded:
// - userId
// - nim
// - createdAt
// - updatedAt
//

export const updateAlumniSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Full name is required")
    .max(200)
    .optional(),

  photo: z
    .string()
    .trim()
    .optional(),

  graduationYear: z
    .number()
    .int()
    .min(1900)
    .max(2100)
    .optional(),

  program: z
    .string()
    .trim()
    .min(1, "Program is required")
    .optional(),

  phone: z
    .string()
    .trim()
    .max(50)
    .optional(),

  location: z
    .string()
    .trim()
    .max(200)
    .optional(),

  currentStatus: z
    .enum([
      ALUMNI_STATUS.WORKING,
      ALUMNI_STATUS.STUDYING,
      ALUMNI_STATUS.ENTREPRENEUR,
      ALUMNI_STATUS.SEEKING_JOB,
      ALUMNI_STATUS.OTHER,
    ])
    .optional(),

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
    .refine(isSafeLinkedInUrl, "LinkedIn URL must use a LinkedIn domain")
    .optional(),

  bio: z
    .string()
    .trim()
    .max(1000)
    .optional(),

  careerHistory: z
    .array(careerHistorySchema)
    .max(50)
    .optional(),

  educationHistory: z
    .array(educationHistorySchema)
    .max(50)
    .optional(),

  isPublic: z
    .boolean()
    .optional(),
});


// ========================================
// ALUMNI SELF UPDATE
// ========================================
//
// Alumni users must not modify identity/
// academic master data.
//

export const updateMyAlumniSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Full name is required")
    .optional(),

  photo: z
    .string()
    .trim()
    .optional(),

  phone: z
    .string()
    .trim()
    .optional(),

  location: z
    .string()
    .trim()
    .optional(),

  currentStatus: z
    .enum([
      ALUMNI_STATUS.WORKING,
      ALUMNI_STATUS.STUDYING,
      ALUMNI_STATUS.ENTREPRENEUR,
      ALUMNI_STATUS.SEEKING_JOB,
      ALUMNI_STATUS.OTHER,
    ])
    .optional(),

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
    .refine(isSafeLinkedInUrl, "LinkedIn URL must use a LinkedIn domain")
    .optional(),

  bio: z
    .string()
    .trim()
    .max(1000)
    .optional(),

  careerHistory: z
    .array(careerHistorySchema)
    .max(50)
    .optional(),

  educationHistory: z
    .array(educationHistorySchema)
    .max(50)
    .optional(),

  isPublic: z
    .boolean()
    .optional(),
});


export type CreateAlumniInput =
  z.infer<typeof createAlumniSchema>;

export type UpdateAlumniInput =
  z.infer<typeof updateAlumniSchema>;

export type UpdateMyAlumniInput =
  z.infer<typeof updateMyAlumniSchema>;
