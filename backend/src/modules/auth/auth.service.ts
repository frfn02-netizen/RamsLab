import bcrypt from "bcrypt";

import {
  findUserByEmail,
  getUsersCollection,
} from "../users/user.repository.js";

import { generateAccessToken } from "./auth.utils.js";

import type { LoginInput } from "./auth.schema.js";
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
