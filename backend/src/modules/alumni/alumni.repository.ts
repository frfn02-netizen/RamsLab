import {
  Collection,
  ObjectId,
} from "mongodb";

import { getDatabase } from "../../config/database.js";

import type { Alumni } from "./alumni.types.js";

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
    const keyword =
      search.trim();

    filter.$or = [
      {
        fullName: {
          $regex: keyword,
          $options: "i",
        },
      },
      {
        nim: {
          $regex: keyword,
          $options: "i",
        },
      },
      {
        program: {
          $regex: keyword,
          $options: "i",
        },
      },
      {
        currentCompany: {
          $regex: keyword,
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