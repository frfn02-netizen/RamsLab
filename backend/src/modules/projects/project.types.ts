import { ObjectId } from "mongodb";

export const PROJECT_STATUS = {
  PLANNING: "PLANNING",
  ONGOING: "ONGOING",
  COMPLETED: "COMPLETED",
} as const;

export type ProjectStatus =
  (typeof PROJECT_STATUS)[keyof typeof PROJECT_STATUS];

export const PROJECT_CATEGORY = {
  RESEARCH: "RESEARCH",
  CONSULTING: "CONSULTING",
  DEVELOPMENT: "DEVELOPMENT",
  OTHER: "OTHER",
} as const;

export type ProjectCategory =
  (typeof PROJECT_CATEGORY)[keyof typeof PROJECT_CATEGORY];

export interface Project {
  _id?: ObjectId;

  title: string;

  slug: string;

  description: string;

  category: ProjectCategory;

  partnerIds: ObjectId[];

  year: number;

  status: ProjectStatus;

  image?: string;

  technologies: string[];

  published: boolean;

  createdAt: Date;

  updatedAt: Date;
}
