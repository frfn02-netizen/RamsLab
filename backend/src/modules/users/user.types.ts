import { ObjectId } from "mongodb";

export const USER_ROLES = {
  ALUMNI: "ALUMNI",
  DOSEN: "DOSEN",
  ADMIN: "ADMIN",
} as const;

export type UserRole =
  (typeof USER_ROLES)[keyof typeof USER_ROLES];

export interface User {
  _id?: ObjectId;

  email: string;

  passwordHash: string;

  role: UserRole;

  isActive: boolean;

  lastLoginAt: Date | null;

  createdAt: Date;

  updatedAt: Date;
}