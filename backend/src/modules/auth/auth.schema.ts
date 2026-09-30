import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().trim().email("Invalid email address").toLowerCase(),

  password: z
    .string()
    .min(1, "Password is required")
    .max(128, "Password is too long"),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(2, "Full name must be at least 2 characters")
      .max(200),
    email: z.string().trim().email("Invalid email address").toLowerCase(),
    tahunAngkatan: z
      .number({
        error: (issue) =>
          issue.code === "invalid_type" && issue.input === undefined
            ? "Tahun Angkatan is required"
            : "Tahun Angkatan must be a valid year",
      })
      .int("Tahun Angkatan must be a whole number")
      .min(1961, "Tahun Angkatan must be between 1961 and 2059")
      .max(2059, "Tahun Angkatan must be between 1961 and 2059"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(128, "Password must be 128 characters or fewer"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type RegisterInput = z.infer<typeof registerSchema>;

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: z.string().min(8).max(128),
});
