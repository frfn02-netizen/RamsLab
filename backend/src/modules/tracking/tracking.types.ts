import { ObjectId } from "mongodb";

export const TRACKING_TYPES = {
  GRADUATION: "GRADUATION",
  EMPLOYMENT: "EMPLOYMENT",
  PROMOTION: "PROMOTION",
  EDUCATION: "EDUCATION",
  ENTREPRENEURSHIP: "ENTREPRENEURSHIP",
  JOB_SEEKING: "JOB_SEEKING",
  OTHER: "OTHER",
} as const;

export type TrackingType = (typeof TRACKING_TYPES)[keyof typeof TRACKING_TYPES];

export interface AlumniTracking {
  _id?: ObjectId;

  alumniId: ObjectId;

  type: TrackingType;

  title: string;

  company?: string;

  position?: string;

  institution?: string;

  location?: string;

  startDate: Date;

  endDate: Date | null;

  description?: string;

  createdAt: Date;

  updatedAt: Date;
}
