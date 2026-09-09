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

export const createExpertSchema = z.object({
  name: z.string().trim().min(2, "Name is required"),
  title: z.string().trim().max(200).optional(),
  employeeId: z.string().trim().optional(),
  nip: z.string().trim().max(50).optional(),
  nidn: z.string().trim().max(50).optional(),
  faculty: z.string().trim().max(150).optional(),
  department: z.string().trim().max(150).optional(),
  institution: z.string().trim().max(200).optional(),
  program: z.string().trim().max(150).optional(),
  position: z.string().trim().max(150).optional(),
  phone: z.string().trim().max(50).optional(),
  photo: z.string().trim().max(500).optional(),
  bio: z.string().trim().max(2000).optional(),
  linkedin: z
    .string()
    .url()
    .refine(isSafeLinkedInUrl, "LinkedIn URL must use a LinkedIn domain")
    .optional(),
  specialization: z.array(z.string().trim().min(1)).max(50).default([]),
  showNip: z.boolean().default(false),
  showNidn: z.boolean().default(false),
  education: z.array(education).max(20).default([]),
  sintaUrl: optionalExternalUrl,
  googleScholarUrl: optionalExternalUrl,
  scopusUrl: optionalExternalUrl,
  orcidUrl: optionalExternalUrl,
  hIndex: z.number().int().min(0).max(1000).optional(),
  publicationCount: z.number().int().min(0).max(100000).optional(),
  projectCount: z.number().int().min(0).max(100000).optional(),
  awardCount: z.number().int().min(0).max(100000).optional(),
  published: z.boolean().default(false),
  isPublic: z.boolean().default(true),
  order: z.number().int().min(0).default(0),
});

export const updateExpertSchema = z.object({
  name: z.string().trim().min(2).optional(),
  title: z.string().trim().max(200).optional(),
  employeeId: z.string().trim().optional(),
  nip: z.string().trim().max(50).optional(),
  nidn: z.string().trim().max(50).optional(),
  faculty: z.string().trim().max(150).optional(),
  department: z.string().trim().max(150).optional(),
  institution: z.string().trim().max(200).optional(),
  program: z.string().trim().max(150).optional(),
  position: z.string().trim().max(150).optional(),
  phone: z.string().trim().max(50).optional(),
  photo: z.string().trim().max(500).optional(),
  bio: z.string().trim().max(2000).optional(),
  linkedin: z
    .string()
    .url()
    .refine(isSafeLinkedInUrl, "LinkedIn URL must use a LinkedIn domain")
    .optional(),
  specialization: z.array(z.string().trim().min(1)).max(50).optional(),
  showNip: z.boolean().optional(),
  showNidn: z.boolean().optional(),
  education: z.array(education).max(20).optional(),
  sintaUrl: optionalExternalUrl,
  googleScholarUrl: optionalExternalUrl,
  scopusUrl: optionalExternalUrl,
  orcidUrl: optionalExternalUrl,
  hIndex: z.number().int().min(0).max(1000).optional(),
  publicationCount: z.number().int().min(0).max(100000).optional(),
  projectCount: z.number().int().min(0).max(100000).optional(),
  awardCount: z.number().int().min(0).max(100000).optional(),
  published: z.boolean().optional(),
  isPublic: z.boolean().optional(),
  order: z.number().int().min(0).optional(),
});

export type CreateExpertInput = z.infer<typeof createExpertSchema>;
export type UpdateExpertInput = z.infer<typeof updateExpertSchema>;
