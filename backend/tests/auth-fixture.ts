import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { ObjectId, type WithId } from "mongodb";
import { getUsersCollection } from "../src/modules/users/user.repository.js";
import type { User } from "../src/modules/users/user.types.js";

export const TEST_ADMIN_USER_ID = "00000000000000000000a001";
export const TEST_DOSEN_USER_ID = "00000000000000000000a002";
export const TEST_ALUMNI_USER_ID = "00000000000000000000a003";

export type UserFixtureSnapshot = {
  id: ObjectId;
  document: WithId<User> | null;
};

export async function snapshotUserFixtures(
  userIds: readonly string[],
): Promise<UserFixtureSnapshot[]> {
  const users = getUsersCollection();
  return Promise.all(
    [...new Set(userIds)].map(async (userId) => {
      const id = new ObjectId(userId);
      return { id, document: await users.findOne({ _id: id }) };
    }),
  );
}

export async function restoreUserFixtures(
  snapshots: readonly UserFixtureSnapshot[],
): Promise<void> {
  const users = getUsersCollection();
  for (const snapshot of snapshots) {
    if (snapshot.document) {
      const { _id: documentId, ...replacement } = snapshot.document;
      void documentId;
      await users.replaceOne({ _id: snapshot.id }, replacement);
    } else {
      await users.deleteOne({ _id: snapshot.id });
    }
  }
}

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
  ]);
}

export function signTestToken(
  userId: string,
  role: "ADMIN" | "DOSEN" | "ALUMNI",
) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is required for tests");
  return jwt.sign({ userId, role, tokenVersion: 0 }, secret, {
    expiresIn: "1h",
    algorithm: "HS256",
    issuer: "rams-platform-api",
  });
}

export async function ensurePasswordUser(input: {
  id: string;
  email: string;
  password: string;
  role: "ADMIN" | "DOSEN" | "ALUMNI";
  isActive?: boolean;
  mustChangePassword?: boolean;
  tokenVersion?: number;
}) {
  const now = new Date();
  const passwordHash = await bcrypt.hash(input.password, 10);
  await getUsersCollection().replaceOne(
    { _id: new ObjectId(input.id) },
    {
      email: input.email,
      passwordHash,
      role: input.role,
      isActive: input.isActive ?? true,
      mustChangePassword: input.mustChangePassword ?? false,
      tokenVersion: input.tokenVersion ?? 0,
      lastLoginAt: null,
      createdAt: now,
      updatedAt: now,
    },
    { upsert: true },
  );
}
