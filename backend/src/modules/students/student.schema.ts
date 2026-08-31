import { z } from "zod";
import { STUDENT_TYPES } from "./student.types.js";
import { isSafeLinkedInUrl } from "../../lib/url-security.js";

const studentType = z.enum([
  STUDENT_TYPES.PHD_STUDENT,
  STUDENT_TYPES.MASTER_STUDENT,
  STUDENT_TYPES.UNDERGRADUATE_STUDENT,
]);

export const createStudentSchema = z.object({
  fullName: z.string().trim().min(2).max(150),
  studentType,
  program: z.string().trim().max(150).optional(),
  specialization: z
    .array(z.string().trim().min(1).max(120))
    .max(50)
    .default([]),
  photo: z.string().trim().url().max(500).optional(),
  bio: z.string().trim().max(2000).optional(),
  linkedin: z
    .string()
    .trim()
    .url()
    .refine(isSafeLinkedInUrl, "LinkedIn URL must use a LinkedIn domain")
    .max(500)
    .optional(),
  isPublic: z.boolean().default(true),
});

export const updateStudentSchema = createStudentSchema.partial();

export type CreateStudentInput = z.infer<typeof createStudentSchema>;
export type UpdateStudentInput = z.infer<typeof updateStudentSchema>;
