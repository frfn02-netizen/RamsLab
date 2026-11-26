import bcrypt from "bcrypt";
import { ObjectId } from "mongodb";

import { HttpError } from "../../middlewares/error.middleware.js";
import { generateTemporaryPassword } from "../auth/auth.utils.js";
import {
  findUserNotificationPreferences,
  getUsersCollection,
  updateUserNotificationPreferences,
} from "./user.repository.js";
import type {
  NotificationPreferenceError,
  NotificationPreferenceUpdate,
} from "./notification-preferences.js";
import { USER_ROLES, type UserNotificationPreferences } from "./user.types.js";

function notificationPreferenceMessage(
  reason: NotificationPreferenceError,
): string {
  switch (reason) {
    case "number_required":
      return "A WhatsApp number is required when consent is active";
    case "missing_country_code":
      return "Include the country code, for example +62";
    case "empty_number":
      return "The WhatsApp number is empty";
    case "invalid_number":
    default:
      return "Enter a valid international WhatsApp number";
  }
}

export async function getNotificationPreferences(
  userId: ObjectId,
): Promise<UserNotificationPreferences> {
  const preferences = await findUserNotificationPreferences(userId);
  if (!preferences) throw new HttpError(404, "User not found");
  return preferences;
}

export async function updateNotificationPreferences(
  userId: ObjectId,
  update: NotificationPreferenceUpdate,
): Promise<UserNotificationPreferences> {
  const result = await updateUserNotificationPreferences(userId, update);
  if (!result) throw new HttpError(404, "User not found");
  if (!result.ok) {
    throw new HttpError(400, notificationPreferenceMessage(result.reason));
  }
  return result.value;
}

export interface CreateAlumniUserInput {
  email: string;
  password: string;
}

export async function createAlumniUser(input: CreateAlumniUserInput) {
  const users = getUsersCollection();

  const email = input.email.trim().toLowerCase();

  const existingUser = await users.findOne({
    email,
  });

  if (existingUser) {
    throw new Error("Email is already registered");
  }

  const passwordHash = await bcrypt.hash(input.password, 12);

  const now = new Date();

  const result = await users.insertOne({
    email,
    passwordHash,
    role: USER_ROLES.ALUMNI,
    isActive: true,
    mustChangePassword: false,
    tokenVersion: 0,
    lastLoginAt: null,
    createdAt: now,
    updatedAt: now,
  });

  return {
    id: result.insertedId.toString(),
    email,
    role: USER_ROLES.ALUMNI,
  };
}
export interface CreateDosenUserInput {
  email: string;
  password?: string;
}

export interface CreateInternalAccountInput {
  fullName: string;
  email: string;
  role: "ADMIN" | "DOSEN";
}

/**
 * Provision a standalone internal account without a public lecturer profile.
 * The generated password is returned once and must be changed on first login.
 */
export async function createInternalAccount(input: CreateInternalAccountInput) {
  const users = getUsersCollection();
  const email = input.email.trim().toLowerCase();
  const displayName = input.fullName.trim();

  if (await users.findOne({ email })) {
    throw new HttpError(409, "Email is already registered");
  }

  const temporaryPassword = generateTemporaryPassword();
  const passwordHash = await bcrypt.hash(temporaryPassword, 12);
  const now = new Date();

  const result = await users.insertOne({
    displayName,
    email,
    passwordHash,
    role: input.role,
    isActive: true,
    mustChangePassword: true,
    tokenVersion: 0,
    lastLoginAt: null,
    createdAt: now,
    updatedAt: now,
  });

  return {
    id: result.insertedId.toString(),
    displayName,
    email,
    role: input.role,
    isActive: true,
    mustChangePassword: true,
    temporaryPassword,
  };
}

export async function createDosenUser(input: CreateDosenUserInput) {
  const users = getUsersCollection();

  const email = input.email.trim().toLowerCase();

  const existingUser = await users.findOne({
    email,
  });

  if (existingUser) {
    throw new Error("Email is already registered");
  }

  const generatedPassword = input.password
    ? undefined
    : generateTemporaryPassword();
  const password = input.password ?? generatedPassword!;
  const passwordHash = await bcrypt.hash(password, 12);

  const now = new Date();

  const result = await users.insertOne({
    email,
    passwordHash,
    role: USER_ROLES.DOSEN,
    isActive: true,
    mustChangePassword: true,
    tokenVersion: 0,
    lastLoginAt: null,
    createdAt: now,
    updatedAt: now,
  });

  return {
    id: result.insertedId.toString(),
    email,
    role: USER_ROLES.DOSEN,
    isActive: true,
    ...(generatedPassword ? { temporaryPassword: generatedPassword } : {}),
  };
}
