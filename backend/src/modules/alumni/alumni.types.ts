import { ObjectId } from "mongodb";

export const ALUMNI_STATUS = {
  WORKING: "WORKING",
  STUDYING: "STUDYING",
  ENTREPRENEUR: "ENTREPRENEUR",
  SEEKING_JOB: "SEEKING_JOB",
  OTHER: "OTHER",
} as const;

export type AlumniStatus = (typeof ALUMNI_STATUS)[keyof typeof ALUMNI_STATUS];

export const ALUMNI_REVIEW_STATUS = {
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
} as const;

export type AlumniReviewStatus =
  (typeof ALUMNI_REVIEW_STATUS)[keyof typeof ALUMNI_REVIEW_STATUS];

export interface CareerHistory {
  company: string;
  position: string;
  startDate: Date;
  endDate: Date | null;
  location?: string;
}

export interface EducationHistory {
  institution: string;
  degree: string;
  fieldOfStudy: string;
  startYear: number;
  endYear: number | null;
}

export interface Alumni {
  _id?: ObjectId;

  userId: ObjectId;

  fullName?: string;

  nim?: string;

  photo?: string;

  angkatan?: number;

  program: string;

  phone?: string;

  location?: string;

  currentStatus: AlumniStatus;

  otherStatus?: string;

  currentCompany?: string;

  currentPosition?: string;

  linkedin?: string;

  bio?: string;

  careerHistory: CareerHistory[];

  educationHistory: EducationHistory[];

  isPublic: boolean;
  reviewStatus?: AlumniReviewStatus;
  profileCompleted: boolean;
  accountEmail?: string;
  accountActive?: boolean;
  mustChangePassword?: boolean;

  createdAt: Date;

  updatedAt: Date;
}
