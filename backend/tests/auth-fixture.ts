import jwt from "jsonwebtoken";
import { ObjectId } from "mongodb";
import { getUsersCollection } from "../src/modules/users/user.repository.js";

export const TEST_ADMIN_USER_ID = "00000000000000000000a001";
export const TEST_DOSEN_USER_ID = "00000000000000000000a002";
export const TEST_ALUMNI_USER_ID = "00000000000000000000a003";
export const TEST_PUBLICATION_EDITOR_USER_ID = "00000000000000000000a004";

export async function ensureTestUsers() {
  const users = getUsersCollection();
  const now = new Date();
  await users.bulkWrite([
    {
      updateOne: {
        filter: { _id: new ObjectId(TEST_ADMIN_USER_ID) },
        update: {
          $set: {
            email: "vitest.admin@test.local",
            role: "ADMIN",
            isActive: true,
            tokenVersion: 0,
            updatedAt: now,
          },
          $setOnInsert: {
            passwordHash: "not-used-by-tests",
            lastLoginAt: null,
            createdAt: now,
          },
        },
        upsert: true,
      },
    },
    {
      updateOne: {
        filter: { _id: new ObjectId(TEST_DOSEN_USER_ID) },
        update: {
          $set: {
            email: "vitest.dosen.account@test.local",
            role: "DOSEN",
            isActive: true,
            tokenVersion: 0,
            updatedAt: now,
          },
          $setOnInsert: {
            passwordHash: "not-used-by-tests",
            lastLoginAt: null,
            createdAt: now,
          },
        },
        upsert: true,
      },
    },
    {
      updateOne: {
        filter: { _id: new ObjectId(TEST_ALUMNI_USER_ID) },
        update: {
          $set: {
            email: "vitest.alumni.account@test.local",
            role: "ALUMNI",
            isActive: true,
            tokenVersion: 0,
            updatedAt: now,
          },
          $setOnInsert: {
            passwordHash: "not-used-by-tests",
            lastLoginAt: null,
            createdAt: now,
          },
        },
        upsert: true,
      },
    },
    {
      updateOne: {
        filter: { _id: new ObjectId(TEST_PUBLICATION_EDITOR_USER_ID) },
        update: {
          $set: {
            email: "vitest.publication.editor@test.local",
            role: "PUBLICATION_EDITOR",
            isActive: true,
            tokenVersion: 0,
            updatedAt: now,
          },
          $setOnInsert: {
            passwordHash: "not-used-by-tests",
            lastLoginAt: null,
            createdAt: now,
          },
        },
        upsert: true,
      },
    },
  ]);
}

export function signTestToken(
  userId: string,
  role: "ADMIN" | "DOSEN" | "ALUMNI" | "PUBLICATION_EDITOR",
) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is required for tests");
  return jwt.sign({ userId, role, tokenVersion: 0 }, secret, {
    expiresIn: "1h",
    algorithm: "HS256",
    issuer: "rams-platform-api",
  });
}
