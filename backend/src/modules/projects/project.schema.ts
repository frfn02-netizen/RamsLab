import { z } from "zod";

import {
  PROJECT_CATEGORY,
  PROJECT_STATUS,
} from "./project.types.js";

export const createProjectSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, "Project title is required")
    .max(200),

  slug: z
    .string()
    .trim()
    .min(3)
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Slug must contain lowercase letters, numbers, and hyphens only"
    ),

  description: z
    .string()
    .trim()
    .min(10, "Description is required")
    .max(5000),

  category: z.enum([
    PROJECT_CATEGORY.RESEARCH,
    PROJECT_CATEGORY.CONSULTING,
    PROJECT_CATEGORY.DEVELOPMENT,
    PROJECT_CATEGORY.OTHER,
  ]),

  partnerIds: z
    .array(z.string())
    .max(50)
    .default([]),

  year: z
    .number()
    .int()
    .min(1900)
    .max(2100),

  status: z.enum([
    PROJECT_STATUS.PLANNING,
    PROJECT_STATUS.ONGOING,
    PROJECT_STATUS.COMPLETED,
  ]),

  image: z
    .string()
    .trim()
    .optional(),

  technologies: z
    .array(
      z
      .string()
      .trim()
      .min(1)
      .max(100)
    )
    .max(50)
    .default([]),

  published: z
    .boolean()
    .default(false),
});

export const updateProjectSchema = z.object({
  title: z.string().trim().min(3).max(200).optional(),
  slug: z.string().trim().min(3).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(),
  description: z.string().trim().min(10).max(5000).optional(),
  category: z.enum([
    PROJECT_CATEGORY.RESEARCH,
    PROJECT_CATEGORY.CONSULTING,
    PROJECT_CATEGORY.DEVELOPMENT,
    PROJECT_CATEGORY.OTHER,
  ]).optional(),
  partnerIds: z.array(z.string()).max(50).optional(),
  year: z.number().int().min(1900).max(2100).optional(),
  status: z.enum([
    PROJECT_STATUS.PLANNING,
    PROJECT_STATUS.ONGOING,
    PROJECT_STATUS.COMPLETED,
  ]).optional(),
  image: z.string().trim().max(500).optional(),
  technologies: z.array(z.string().trim().min(1).max(100)).max(50).optional(),
  published: z.boolean().optional(),
});

export type CreateProjectInput =
  z.infer<typeof createProjectSchema>;

export type UpdateProjectInput =
  z.infer<typeof updateProjectSchema>;
