import { z } from "zod";
import { ALUMNI_STATUS } from "./alumni.types.js";

const careerHistorySchema = z.object({
  company: z
    .string()
    .trim()
    .min(1, "Company is required"),

  position: z
    .string()
    .trim()
    .min(1, "Position is required"),

  startDate: z.coerce.date(),

  endDate: z.coerce.date().nullable(),

  location: z
    .string()
    .trim()
    .optional(),
});

const educationHistorySchema = z.object({
  institution: z
    .string()
    .trim()
    .min(1, "Institution is required"),

  degree: z
    .string()
    .trim()
    .min(1, "Degree is required"),

  fieldOfStudy: z
    .string()
    .trim()
    .min(1, "Field of study is required"),

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

export const createAlumniSchema = z.object({
  userId: z.string().min(1),

  fullName: z
    .string()
    .trim()
    .min(2, "Full name is required"),

  nim: z
    .string()
    .trim()
    .min(1, "NIM is required"),

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

  careerHistory: z
    .array(careerHistorySchema)
    .default([]),

  educationHistory: z
    .array(educationHistorySchema)
    .default([]),

  isPublic: z
    .boolean()
    .default(false),
});

export const updateAlumniSchema =
  createAlumniSchema
    .omit({
      userId: true,
    })
    .partial();

export type CreateAlumniInput =
  z.infer<typeof createAlumniSchema>;

export type UpdateAlumniInput =
  z.infer<typeof updateAlumniSchema>;