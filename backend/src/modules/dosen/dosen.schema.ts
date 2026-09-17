import { z } from "zod";
import { isSafeHttpUrl, isSafeLinkedInUrl } from "../../lib/url-security.js";

const optionalExternalUrl = z
  .string()
  .url()
  .refine(isSafeHttpUrl, "URL must use HTTP or HTTPS")
  .optional();

const education = z.object({
  degree: z.string().trim().min(1).max(50),
  field: z.string().trim().min(1).max(150),
  institution: z.string().trim().min(1).max(200),
  startYear: z.number().int().min(1900).max(2100).optional(),
  endYear: z.number().int().min(1900).max(2100).optional(),
});

// References to Publication records explicitly associated with the lecturer.
// Only the IDs are stored; Publication documents remain canonical and are
// never embedded or duplicated here.
const publicationIdsField = z
  .array(z.string().regex(/^[a-f\d]{24}$/i, "Invalid publication ID"))
  .max(200);

export const createDosenSchema = z.object({
  userId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid user ID"),

  fullName: z.string().trim().min(2, "Full name is required"),

  employeeId: z.string().trim().optional(),

  nip: z.string().trim().max(50).optional(),

  nidn: z.string().trim().max(50).optional(),

  faculty: z.string().trim().max(150).optional(),

  department: z.string().trim().max(150).optional(),

  institution: z.string().trim().max(200).optional(),

  program: z.string().trim().max(150).optional(),

  title: z.string().trim().optional(),

  position: z.string().trim().optional(),

  specialization: z.array(z.string().trim().min(1)).max(50).default([]),

  email: z.string().trim().email().optional(),

  phone: z.string().trim().optional(),

  photo: z.string().trim().optional(),

  bio: z.string().trim().max(2000).optional(),

  linkedin: z
    .string()
    .url()
    .refine(isSafeLinkedInUrl, "LinkedIn URL must use a LinkedIn domain")
    .optional(),

  showNip: z.boolean().default(false),
  showNidn: z.boolean().default(false),
  showEmail: z.boolean().default(false),

  education: z.array(education).max(20).default([]),
  sintaUrl: optionalExternalUrl,
  googleScholarUrl: optionalExternalUrl,
  scopusUrl: optionalExternalUrl,
  orcidUrl: optionalExternalUrl,
  hIndex: z.number().int().min(0).max(1000).optional(),
  publicationCount: z.number().int().min(0).max(100000).optional(),
  projectCount: z.number().int().min(0).max(100000).optional(),
  awardCount: z.number().int().min(0).max(100000).optional(),

  isPublic: z.boolean().default(true),

  publicationIds: publicationIdsField.default([]),
});

export const updateDosenSchema = z.object({
  fullName: z.string().trim().min(2).optional(),
  employeeId: z.string().trim().min(1).optional(),
  nip: z.string().trim().max(50).optional(),
  nidn: z.string().trim().max(50).optional(),
  faculty: z.string().trim().max(150).optional(),
  department: z.string().trim().max(150).optional(),
  institution: z.string().trim().max(200).optional(),
  program: z.string().trim().max(150).optional(),
  title: z.string().trim().max(100).optional(),
  position: z.string().trim().max(150).optional(),
  specialization: z.array(z.string().trim().min(1)).max(50).optional(),
  email: z.string().trim().email().optional(),
  phone: z.string().trim().max(50).optional(),
  photo: z.string().trim().max(500).optional(),
  bio: z.string().trim().max(2000).optional(),
  linkedin: z
    .string()
    .url()
    .refine(isSafeLinkedInUrl, "LinkedIn URL must use a LinkedIn domain")
    .optional(),
  showNip: z.boolean().optional(),
  showNidn: z.boolean().optional(),
  showEmail: z.boolean().optional(),
  education: z.array(education).max(20).optional(),
  sintaUrl: optionalExternalUrl,
  googleScholarUrl: optionalExternalUrl,
  scopusUrl: optionalExternalUrl,
  orcidUrl: optionalExternalUrl,
  hIndex: z.number().int().min(0).max(1000).optional(),
  publicationCount: z.number().int().min(0).max(100000).optional(),
  projectCount: z.number().int().min(0).max(100000).optional(),
  awardCount: z.number().int().min(0).max(100000).optional(),
  isPublic: z.boolean().optional(),

  publicationIds: publicationIdsField.optional(),
});

export type CreateDosenInput = z.infer<typeof createDosenSchema>;

export type UpdateDosenInput = z.infer<typeof updateDosenSchema>;
