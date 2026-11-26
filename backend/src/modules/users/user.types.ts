import { ObjectId } from "mongodb";

export const USER_ROLES = {
  ALUMNI: "ALUMNI",
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

  whatsappNumber?: string | null;

  whatsappOptIn?: boolean;

  whatsappOptInAt?: Date | null;

  whatsappConsentNumber?: string | null;

  /** Incremented to revoke all previously issued access tokens. */
  tokenVersion?: number;

  lastLoginAt: Date | null;

  createdAt: Date;

  updatedAt: Date;
}

export interface UserReminderContact {
  _id?: ObjectId;
  displayName?: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  whatsappNumber?: string | null;
  whatsappOptIn?: boolean;
  whatsappConsentNumber?: string | null;
}

export interface UserNotificationPreferences {
  whatsappNumber: string | null;
  whatsappOptIn: boolean;
  whatsappOptInAt: Date | null;
  whatsappConsentNumber: string | null;
}
