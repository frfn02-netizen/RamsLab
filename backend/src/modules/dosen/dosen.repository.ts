import {
  Collection,
  ObjectId,
} from "mongodb";

import { getDatabase } from "../../config/database.js";

import type { Dosen } from "./dosen.types.js";

const DOSEN_COLLECTION = "dosen";

export function getDosenCollection(): Collection<Dosen> {
  return getDatabase().collection<Dosen>(
    DOSEN_COLLECTION
  );
}

export async function findDosenByUserId(
  userId: ObjectId
): Promise<Dosen | null> {
  const collection = getDosenCollection();

  return collection.findOne({
    userId,
  });
}

export async function findDosenById(
  id: string
): Promise<Dosen | null> {
  if (!ObjectId.isValid(id)) {
    return null;
  }

  const collection = getDosenCollection();

  return collection.findOne({
    _id: new ObjectId(id),
  });
}

export async function findDosenByEmployeeId(
  employeeId: string
): Promise<Dosen | null> {
  const collection = getDosenCollection();

  return collection.findOne({
    employeeId,
  });
}