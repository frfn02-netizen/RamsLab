import { ObjectId } from "mongodb";

export const USER_ROLES = {
  ALUMNI: "ALUMNI",
  DOSEN: "DOSEN",
  ADMIN: "ADMIN",
  PUBLICATION_EDITOR: "PUBLICATION_EDITOR",
} as const;

export type UserRole =
  (typeof USER_ROLES)[keyof typeof USER_ROLES];

export interface User {
  _id?: ObjectId;

  email: string;

  passwordHash: string;

  role: UserRole;

  isActive: boolean;

  /** Incremented to revoke all previously issued access tokens. */
  tokenVersion?: number;

  lastLoginAt: Date | null;

  createdAt: Date;

  updatedAt: Date;
}
