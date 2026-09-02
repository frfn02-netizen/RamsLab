import { z } from "zod";
import { isSafeLinkedInUrl } from "../../lib/url-security.js";

export const createAdminAlumniSchema = z.object({
  email: z.string().trim().email("Invalid email"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128),
  // Retained only so malformed legacy payloads are still rejected safely; the
  // admin UI does not render or submit profile fields.
  linkedin: z.preprocess(
    (value) =>
      typeof value === "string" && value.trim() === "" ? undefined : value,
    z.string().url().refine(isSafeLinkedInUrl).optional(),
  ),
});

export type CreateAdminAlumniInput = z.infer<typeof createAdminAlumniSchema>;
