import bcrypt from "bcrypt";

import {
  deleteUser,
  findUserByEmail,
  getUsersCollection,
} from "../users/user.repository.js";
import { createAlumniUser } from "../users/user.service.js";
import { createAlumniShell } from "../alumni/alumni.service.js";

import { generateAccessToken } from "./auth.utils.js";

import type { LoginInput, RegisterInput } from "./auth.schema.js";
import { ObjectId } from "mongodb";

export async function login(input: LoginInput) {
  const user = await findUserByEmail(input.email);

  if (!user || !user.isActive) {
    throw new Error("Invalid email or password");
  }

  const passwordMatches = await bcrypt.compare(
    input.password,
    user.passwordHash,
  );

  if (!passwordMatches) {
    throw new Error("Invalid email or password");
  }

  const token = generateAccessToken({
    userId: user._id!.toString(),
    role: user.role,
    tokenVersion: user.tokenVersion ?? 0,
  });

  if (user._id) {
    await getUsersCollection().updateOne(
      { _id: user._id },
      { $set: { lastLoginAt: new Date() } },
    );
  }

  return {
    token,
    user: {
      id: user._id!.toString(),
      email: user.email,
      role: user.role,
      mustChangePassword: user.mustChangePassword ?? false,
    },
  };
}

export async function register(input: RegisterInput) {
  const existingUser = await findUserByEmail(input.email);
  if (existingUser) {
    throw new Error("Email is already registered");
  }

  const user = await createAlumniUser({
    email: input.email,
    password: input.password,
  });

  let alumni;
  try {
    alumni = await createAlumniShell(user.id);
  } catch (error) {
    await deleteUser(new ObjectId(user.id));
    throw error;
  }

  const token = generateAccessToken({
    userId: user.id,
    role: user.role,
    tokenVersion: 0,
  });

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      mustChangePassword: true,
    },
    alumni,
  };
}

export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
) {
  if (!ObjectId.isValid(userId)) throw new Error("Invalid user ID");
  const users = getUsersCollection();
  const user = await users.findOne({ _id: new ObjectId(userId) });
  if (!user || !(await bcrypt.compare(currentPassword, user.passwordHash)))
    throw new Error("Current password is invalid");
  await users.updateOne(
    { _id: new ObjectId(userId) },
    {
      $set: {
        passwordHash: await bcrypt.hash(newPassword, 12),
        mustChangePassword: false,
        updatedAt: new Date(),
      },
    },
  );
}
