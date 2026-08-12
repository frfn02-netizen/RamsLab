import { Collection, ObjectId, } from "mongodb";
import { getDatabase,} from "../../config/database.js";
import type { Dosen, } from "./dosen.types.js";
import type { CreateDosenInput, UpdateDosenInput, } from "./dosen.schema.js";

const DOSEN_COLLECTION = "dosen";

export function getDosenCollection():
  Collection<Dosen> {
  return getDatabase().collection<Dosen>(
    DOSEN_COLLECTION
  );
}


// ========================================
// FIND BY USER
// ========================================

export async function findDosenByUserId(
  userId: ObjectId
): Promise<Dosen | null> {

  const collection =
    getDosenCollection();

  return collection.findOne({
    userId,
  });
}


// ========================================
// FIND BY ID
// ========================================

export async function findDosenById(
  id: string
): Promise<Dosen | null> {

  if (!ObjectId.isValid(id)) {
    return null;
  }

  const collection =
    getDosenCollection();

  return collection.findOne({
    _id: new ObjectId(id),
  });
}


// ========================================
// FIND BY EMPLOYEE ID
// ========================================

export async function findDosenByEmployeeId(
  employeeId: string
): Promise<Dosen | null> {

  const collection =
    getDosenCollection();

  return collection.findOne({
    employeeId,
  });
}


// ========================================
// LIST DOSEN
// ========================================

export async function findAllDosen(
  options?: {
    publicOnly?: boolean;
  }
): Promise<Dosen[]> {

  const collection =
    getDosenCollection();

  const filter: Record<string, unknown> = {};

  if (options?.publicOnly) {
    filter.isPublic = true;
  }

  return collection
    .find(filter)
    .sort({
      fullName: 1,
    })
    .toArray();
}


// ========================================
// CREATE
// ========================================

export async function createDosen(
  input: CreateDosenInput
): Promise<Dosen> {

  const collection =
    getDosenCollection();

  const now = new Date();

  const dosen: Dosen = {
    userId: new ObjectId(input.userId),

    fullName: input.fullName,

    employeeId:
      input.employeeId,

    title:
      input.title,

    position:
      input.position,

    specialization:
      input.specialization,

    email:
      input.email,

    phone:
      input.phone,

    photo:
      input.photo,

    bio:
      input.bio,

    linkedin:
      input.linkedin,

    isPublic:
      input.isPublic,

    createdAt: now,

    updatedAt: now,
  };

  const result =
    await collection.insertOne(dosen);

  return {
    ...dosen,
    _id: result.insertedId,
  };
}


// ========================================
// UPDATE
// ========================================

export async function updateDosen(
  id: string,
  input: UpdateDosenInput
): Promise<Dosen | null> {

  if (!ObjectId.isValid(id)) {
    return null;
  }

  const collection =
    getDosenCollection();

  const updateData = {
    ...input,
    updatedAt: new Date(),
  };

  const result =
    await collection.findOneAndUpdate(
      {
        _id: new ObjectId(id),
      },
      {
        $set: updateData,
      },
      {
        returnDocument: "after",
      }
    );

  return result;
}


// ========================================
// DELETE
// ========================================

export async function deleteDosen(
  id: string
): Promise<boolean> {

  if (!ObjectId.isValid(id)) {
    return false;
  }

  const collection =
    getDosenCollection();

  const result =
    await collection.deleteOne({
      _id: new ObjectId(id),
    });

  return result.deletedCount === 1;
}