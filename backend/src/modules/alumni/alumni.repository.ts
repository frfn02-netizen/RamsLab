import {
  Collection,
  ObjectId,
} from "mongodb";

import { getDatabase } from "../../config/database.js";

import type { Alumni } from "./alumni.types.js";
import { SECURITY_LIMITS } from "../../config/security.js";

const ALUMNI_COLLECTION = "alumni";

export function getAlumniCollection(): Collection<Alumni> {
  return getDatabase().collection<Alumni>(
    ALUMNI_COLLECTION
  );
}

export async function findAlumniByUserId(
  userId: ObjectId
): Promise<Alumni | null> {
  const collection = getAlumniCollection();

  return collection.findOne({
    userId,
  });
}

export async function findAlumniById(
  id: string
): Promise<Alumni | null> {
  if (!ObjectId.isValid(id)) {
    return null;
  }

  const collection = getAlumniCollection();

  return collection.findOne({
    _id: new ObjectId(id),
  });
}

export async function findAlumniByNim(
  nim: string
): Promise<Alumni | null> {
  const collection = getAlumniCollection();

  return collection.findOne({
    nim,
  });
}

export async function findPublicAlumni(): Promise<Alumni[]> {
  return getAlumniCollection()
    .find({ isPublic: true })
    .sort({ fullName: 1 })
    .limit(SECURITY_LIMITS.maxListResults)
    .toArray();
}

export interface AlumniListParams {
  page: number;
  limit: number;
  search?: string;
}

export async function findAlumniList(
  params: AlumniListParams
) {
  const collection =
    getAlumniCollection();

  const {
    page,
    limit,
    search,
  } = params;

  const skip =
    (page - 1) * limit;

  const filter: Record<string, unknown> = {};

  if (search?.trim()) {
    const keyword = search.trim().slice(0, SECURITY_LIMITS.maxSearchLength);
    const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    filter.$or = [
      {
        fullName: {
          $regex: escapedKeyword,
          $options: "i",
        },
      },
      {
        nim: {
          $regex: escapedKeyword,
          $options: "i",
        },
      },
      {
        program: {
          $regex: escapedKeyword,
          $options: "i",
        },
      },
      {
        currentCompany: {
          $regex: escapedKeyword,
          $options: "i",
        },
      },
    ];
  }

  const [
    data,
    total,
  ] = await Promise.all([
    collection
      .find(filter)
      .sort({
        createdAt: -1,
      })
      .skip(skip)
      .limit(limit)
      .toArray(),

    collection.countDocuments(filter),
  ]);

  return {
    data,
    total,
  };
}
export async function countAlumni(): Promise<number> {
  const collection = getAlumniCollection();

  return collection.countDocuments();
}

export async function deleteAlumni(id: string): Promise<boolean> {
  if (!ObjectId.isValid(id)) return false;
  const result = await getAlumniCollection().deleteOne({ _id: new ObjectId(id) });
  return result.deletedCount === 1;
}
