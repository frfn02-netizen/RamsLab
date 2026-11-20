import { Collection, Filter, ObjectId } from "mongodb";
import { getDatabase } from "../../config/database.js";
import { SECURITY_LIMITS } from "../../config/security.js";
import { PERMISSIONS } from "../../middlewares/permission.middlewares.js";
import { getDosenCollection } from "../dosen/dosen.repository.js";
import type { User, UserDirectoryEntry } from "./user.types.js";

const USERS_COLLECTION = "users";

export function getUsersCollection(): Collection<User> {
  return getDatabase().collection<User>(USERS_COLLECTION);
}

export async function findUserByEmail(email: string): Promise<User | null> {
  const collection = getUsersCollection();

  return collection.findOne({
    email: email.toLowerCase(),
  });
}

export async function findUserById(id: string): Promise<User | null> {
  if (!ObjectId.isValid(id)) {
    return null;
  }

  const collection = getUsersCollection();

  return collection.findOne({
    _id: new ObjectId(id),
  } as Partial<User>);
}
export async function findUsersByIds(
  ids: ObjectId[],
): Promise<UserDirectoryEntry[]> {
  if (ids.length === 0) return [];

  const users = await getUsersCollection()
    .find(
      { _id: { $in: ids } },
      {
        projection: {
          displayName: 1,
          email: 1,
          role: 1,
          isActive: 1,
          permissions: 1,
        },
      },
    )
    .toArray();

  return withDosenNames(users);
}

export async function findActiveUsersDirectory(): Promise<
  UserDirectoryEntry[]
> {
  const users = await getUsersCollection()
    .find(
      {
        isActive: true,
        role: { $in: ["ADMIN", "DOSEN", "STUDENT"] },
      },
      {
        projection: {
          displayName: 1,
          email: 1,
          role: 1,
          isActive: 1,
          permissions: 1,
        },
      },
    )
    .sort({ email: 1 })
    .limit(SECURITY_LIMITS.maxListResults)
    .toArray();

  return withDosenNames(users);
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function findStudentAccounts(options: {
  query?: string;
  limit: number;
  offset: number;
}): Promise<UserDirectoryEntry[]> {
  const filter: Filter<User> = { role: "STUDENT" };
  const query = options.query?.trim();
  if (query) {
    const pattern = new RegExp(escapeRegex(query), "i");
    filter.$or = [{ email: pattern }, { displayName: pattern }];
  }

  const users = await getUsersCollection()
    .find(filter, {
      projection: {
        displayName: 1,
        email: 1,
        role: 1,
        isActive: 1,
        permissions: 1,
      },
    })
    .sort({ email: 1 })
    .skip(options.offset)
    .limit(options.limit + 1)
    .toArray();

  return withDosenNames(users);
}

async function withDosenNames(
  users: UserDirectoryEntry[],
): Promise<UserDirectoryEntry[]> {
  const userIds = users
    .map((user) => user._id)
    .filter((value): value is ObjectId => Boolean(value));
  if (userIds.length === 0) return users;

  const profiles = await getDosenCollection()
    .find(
      { userId: { $in: userIds } },
      { projection: { userId: 1, fullName: 1 } },
    )
    .toArray();
  const names = new Map(
    profiles.map((profile) => [profile.userId.toString(), profile.fullName]),
  );

  return users.map((user) => ({
    ...user,
    displayName:
      user.displayName?.trim() ||
      (user._id ? names.get(user._id.toString()) : undefined),
  }));
}

export async function countUsers(): Promise<number> {
  const collection = getUsersCollection();

  return collection.countDocuments();
}

export async function incrementUserTokenVersion(id: string): Promise<boolean> {
  if (!ObjectId.isValid(id)) return false;

  const result = await getUsersCollection().updateOne(
    { _id: new ObjectId(id) },
    { $inc: { tokenVersion: 1 }, $set: { updatedAt: new Date() } },
  );

  return result.modifiedCount === 1;
}

export async function setUserPassword(
  userId: ObjectId,
  passwordHash: string,
  options: {
    mustChangePassword: boolean;
    incrementTokenVersion: boolean;
    expectedPasswordHash?: string;
  },
): Promise<number | null> {
  const update: Record<string, unknown> = {
    $set: {
      passwordHash,
      mustChangePassword: options.mustChangePassword,
      updatedAt: new Date(),
    },
  };
  if (options.incrementTokenVersion) {
    update.$inc = { tokenVersion: 1 };
  }

  const filter: Filter<User> = { _id: userId };
  if (options.expectedPasswordHash) {
    filter.passwordHash = options.expectedPasswordHash;
  }

  const result = await getUsersCollection().findOneAndUpdate(filter, update, {
    returnDocument: "after",
  });

  return result?.tokenVersion ?? null;
}

export async function setUserSchedulePortalAccess(
  id: ObjectId,
  enabled: boolean,
): Promise<User | null> {
  const update = enabled
    ? { $addToSet: { permissions: PERMISSIONS.SCHEDULE_PORTAL_ACCESS } }
    : { $pull: { permissions: PERMISSIONS.SCHEDULE_PORTAL_ACCESS } };
  return getUsersCollection().findOneAndUpdate(
    { _id: id },
    { ...update, $set: { updatedAt: new Date() } },
    { returnDocument: "after" },
  );
}

export async function setUserAgendaManageAccess(
  id: ObjectId,
  enabled: boolean,
): Promise<User | null> {
  const update = enabled
    ? { $addToSet: { permissions: PERMISSIONS.AGENDA_MANAGE } }
    : { $pull: { permissions: PERMISSIONS.AGENDA_MANAGE } };
  return getUsersCollection().findOneAndUpdate(
    { _id: id, role: "STUDENT" },
    { ...update, $set: { updatedAt: new Date() } },
    { returnDocument: "after" },
  );
}

export async function deactivateUser(id: ObjectId): Promise<boolean> {
  const result = await getUsersCollection().updateOne(
    { _id: id },
    {
      $set: {
        isActive: false,
        updatedAt: new Date(),
      },
      $inc: { tokenVersion: 1 },
    },
  );

  return result.matchedCount === 1;
}

export async function setUserActive(
  id: ObjectId,
  isActive: boolean,
): Promise<boolean> {
  const result = await getUsersCollection().updateOne(
    { _id: id },
    { $set: { isActive, updatedAt: new Date() }, $inc: { tokenVersion: 1 } },
  );
  return result.matchedCount === 1;
}

export async function deleteUser(id: ObjectId): Promise<boolean> {
  const result = await getUsersCollection().deleteOne({ _id: id });
  return result.deletedCount === 1;
}
