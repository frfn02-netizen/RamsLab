import { z } from "zod";
import { USER_ROLES } from "./user.types.js";

export const createUserSchema = z.object({
  email: z.string().trim().email("Invalid email address").toLowerCase(),

  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password is too long"),

  role: z.enum([
    USER_ROLES.ALUMNI,
    USER_ROLES.STUDENT,
    USER_ROLES.DOSEN,
    USER_ROLES.ADMIN,
  ]),

  isActive: z.boolean().default(true),
});

export const updateUserSchema = z.object({
  email: z
    .string()
    .trim()
    .email("Invalid email address")
    .toLowerCase()
    .optional(),

  isActive: z.boolean().optional(),
});

export const createManagedAccountSchema = z.object({
  email: createUserSchema.shape.email,
  password: createUserSchema.shape.password.optional(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;

export type UpdateUserInput = z.infer<typeof updateUserSchema>;

export const createStudentUserSchema = z.object({
  email: createUserSchema.shape.email,
  displayName: z.string().trim().min(2).max(200).optional(),
  schedulePortalAccess: z.boolean().default(false),
});

export const updateSchedulePortalAccessSchema = z.object({
  enabled: z.boolean(),
});

export const updateAgendaManageAccessSchema = z.object({
  enabled: z.boolean(),
});

export type CreateStudentUserInput = z.infer<typeof createStudentUserSchema>;
export type UpdateSchedulePortalAccessInput = z.infer<
  typeof updateSchedulePortalAccessSchema
>;
