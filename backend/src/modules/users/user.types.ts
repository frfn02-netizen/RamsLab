import { ObjectId } from "mongodb";

export const USER_ROLES = {
  ALUMNI: "ALUMNI",
  STUDENT: "STUDENT",
  DOSEN: "DOSEN",
  ADMIN: "ADMIN",
} as const;

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];

export interface UserDirectoryEntry {
  _id?: ObjectId;
  displayName?: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  permissions?: string[];
}

export interface User {
  _id?: ObjectId;

  displayName?: string;

  email: string;

  passwordHash: string;

  role: UserRole;

  isActive: boolean;

  permissions?: string[];

  mustChangePassword?: boolean;

  /** Incremented to revoke all previously issued access tokens. */
  tokenVersion?: number;

  lastLoginAt: Date | null;

  createdAt: Date;

  updatedAt: Date;
}
