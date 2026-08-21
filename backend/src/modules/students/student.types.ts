import { ObjectId } from "mongodb";

export const STUDENT_TYPES = {
  PHD_STUDENT: "PHD_STUDENT",
  UNDERGRADUATE_STUDENT: "UNDERGRADUATE_STUDENT",
} as const;

export type StudentType = (typeof STUDENT_TYPES)[keyof typeof STUDENT_TYPES];

export interface Student {
  _id?: ObjectId;
  fullName: string;
  studentType: StudentType;
  program?: string;
  specialization: string[];
  photo?: string;
  bio?: string;
  linkedin?: string;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}
