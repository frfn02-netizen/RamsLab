import bcrypt from "bcrypt";

import {
  findUserByEmail,
  getUsersCollection,
} from "../users/user.repository.js";

import { generateAccessToken } from "./auth.utils.js";

import type { LoginInput } from "./auth.schema.js";

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
    },
  };
}
