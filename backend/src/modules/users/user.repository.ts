import { Collection, ObjectId } from "mongodb";
import { getDatabase } from "../../config/database.js";
import type { User } from "./user.types.js";

const USERS_COLLECTION = "users";

export function getUsersCollection(): Collection<User> {
  return getDatabase().collection<User>(USERS_COLLECTION);
}

export async function findUserByEmail(
  email: string
): Promise<User | null> {
  const collection = getUsersCollection();

  return collection.findOne({
    email: email.toLowerCase(),
  });
}

export async function findUserById(
  id: string
): Promise<User | null> {
  if (!ObjectId.isValid(id)) {
    return null;
  }

  const collection = getUsersCollection();

  return collection.findOne({
    _id: new ObjectId(id),
  } as Partial<User>);
}