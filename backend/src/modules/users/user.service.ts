import bcrypt from "bcrypt";
import { getUsersCollection, } from "./user.repository.js";
import { USER_ROLES, } from "./user.types.js";

export interface CreateAlumniUserInput {
  email: string;
  password: string;
}

export async function createAlumniUser(
  input: CreateAlumniUserInput
) {
  const users =
    getUsersCollection();

  const email =
    input.email.trim().toLowerCase();

  const existingUser =
    await users.findOne({
      email,
    });

  if (existingUser) {
    throw new Error(
      "Email is already registered"
    );
  }

  const passwordHash =
    await bcrypt.hash(
      input.password,
      12
    );

  const now = new Date();

  const result =
    await users.insertOne({
      email,
      passwordHash,
      role: USER_ROLES.ALUMNI,
      isActive: true,
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