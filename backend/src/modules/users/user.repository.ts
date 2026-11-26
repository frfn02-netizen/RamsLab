import { Collection, Filter, ObjectId } from "mongodb";
import { getDatabase } from "../../config/database.js";
import { SECURITY_LIMITS } from "../../config/security.js";
import { getDosenCollection } from "../dosen/dosen.repository.js";
import {
  resolveNotificationPreferences,
  type NotificationPreferenceError,
  type NotificationPreferenceUpdate,
} from "./notification-preferences.js";
import type {
  User,
  UserDirectoryEntry,
  UserNotificationPreferences,
  UserReminderContact,
} from "./user.types.js";

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
        role: { $in: ["ADMIN", "DOSEN"] },
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

export async function findReminderContactsByIds(
  ids: ObjectId[],
): Promise<UserReminderContact[]> {
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
          whatsappNumber: 1,
          whatsappOptIn: 1,
          whatsappConsentNumber: 1,
        },
      },
    )
    .toArray();

  return withDosenNames(users);
}

export async function findActiveInternalEmailContacts(): Promise<
  UserReminderContact[]
> {
  const users = await getUsersCollection()
    .find(
      {
        isActive: true,
        role: { $in: ["ADMIN", "DOSEN"] },
      },
      {
        projection: {
          displayName: 1,
          email: 1,
          role: 1,
          isActive: 1,
        },
      },
    )
    .sort({ email: 1 })
    .toArray();

  const seen = new Set<string>();
  const unique = users.filter((user) => {
    const key = user.email.trim().toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return withDosenNames(unique);
}

export async function findUserNotificationPreferences(
  id: ObjectId,
): Promise<UserNotificationPreferences | null> {
  const user = await getUsersCollection().findOne(
    { _id: id },
    {
      projection: {
        whatsappNumber: 1,
        whatsappOptIn: 1,
        whatsappOptInAt: 1,
        whatsappConsentNumber: 1,
      },
    },
  );
  if (!user) return null;

  return {
    whatsappNumber: user.whatsappNumber ?? null,
    whatsappOptIn: user.whatsappOptIn === true,
    whatsappOptInAt: user.whatsappOptInAt ?? null,
    whatsappConsentNumber: user.whatsappConsentNumber ?? null,
  };
}

export type UpdateUserNotificationPreferencesResult =
  | { ok: true; value: UserNotificationPreferences }
  | { ok: false; reason: NotificationPreferenceError }
  | null;

export async function updateUserNotificationPreferences(
  id: ObjectId,
  update: NotificationPreferenceUpdate,
  now: Date = new Date(),
): Promise<UpdateUserNotificationPreferencesResult> {
  const existing = await findUserNotificationPreferences(id);
  if (!existing) return null;

  const resolved = resolveNotificationPreferences(existing, update, now);
  if (!resolved.ok) return resolved;

  const user = await getUsersCollection().findOneAndUpdate(
    { _id: id },
    {
      $set: {
        ...resolved.value,
        updatedAt: now,
      },
    },
    {
      returnDocument: "after",
      projection: {
        whatsappNumber: 1,
        whatsappOptIn: 1,
        whatsappOptInAt: 1,
        whatsappConsentNumber: 1,
      },
    },
  );
  if (!user) return null;

  return {
    ok: true,
    value: {
      whatsappNumber: user.whatsappNumber ?? null,
      whatsappOptIn: user.whatsappOptIn === true,
      whatsappOptInAt: user.whatsappOptInAt ?? null,
      whatsappConsentNumber: user.whatsappConsentNumber ?? null,
    },
  };
}

async function withDosenNames<
  T extends { _id?: ObjectId; displayName?: string },
>(users: T[]): Promise<T[]> {
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
