import bcrypt from "bcrypt";
import { PERMISSIONS } from "../../middlewares/permission.middlewares.js";
import { generateTemporaryPassword } from "../auth/auth.utils.js";
import { getUsersCollection } from "./user.repository.js";
import { USER_ROLES } from "./user.types.js";

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

export async function createDosenUser(input: CreateDosenUserInput) {
  const users = getUsersCollection();

  const email = input.email.trim().toLowerCase();

  const existingUser = await users.findOne({
    email,
  });

  if (existingUser) {
    throw new Error("Email is already registered");
  }

  const generatedPassword = input.password ? undefined : generateTemporaryPassword();
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

export interface CreateStudentUserInput {
  email: string;
  displayName?: string;
  schedulePortalAccess: boolean;
}

export async function createStudentUser(input: CreateStudentUserInput) {
  const users = getUsersCollection();
  const email = input.email.trim().toLowerCase();

  const existingUser = await users.findOne({ email });
  if (existingUser) {
    throw new Error("Email is already registered");
  }

  const temporaryPassword = generateTemporaryPassword();
  const passwordHash = await bcrypt.hash(temporaryPassword, 12);
  const permissions = input.schedulePortalAccess
    ? [PERMISSIONS.SCHEDULE_PORTAL_ACCESS]
    : [];
  const now = new Date();

  const result = await users.insertOne({
    email,
    displayName: input.displayName?.trim() || undefined,
    passwordHash,
    role: USER_ROLES.STUDENT,
    isActive: true,
    permissions,
    mustChangePassword: true,
    tokenVersion: 0,
    lastLoginAt: null,
    createdAt: now,
    updatedAt: now,
  });

  return {
    id: result.insertedId.toString(),
    email,
    displayName: input.displayName?.trim() || undefined,
    role: USER_ROLES.STUDENT,
    isActive: true,
    permissions,
    mustChangePassword: true,
    temporaryPassword,
  };
}
