import { z } from "zod";
import { USER_ROLES } from "./user.types.js";

export const createUserSchema = z.object({
  email: z
    .string()
    .trim()
    .email("Invalid email address")
    .toLowerCase(),

  password: z
    .string()
    .min(8, "Password must be at least 8 characters"),

  role: z.enum([
    USER_ROLES.ALUMNI,
    USER_ROLES.DOSEN,
    USER_ROLES.ADMIN,
  ]),

  isActive: z
    .boolean()
    .default(true),
});

export const updateUserSchema = z.object({
  email: z
    .string()
    .trim()
    .email("Invalid email address")
    .toLowerCase()
    .optional(),

  isActive: z
    .boolean()
    .optional(),
});

export type CreateUserInput =
  z.infer<typeof createUserSchema>;

export type UpdateUserInput =
  z.infer<typeof updateUserSchema>;