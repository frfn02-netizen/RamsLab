import { Collection, ObjectId } from "mongodb";
import { getDatabase } from "../../config/database.js";
import type { AlumniTracking } from "./tracking.types.js";
import type {
  CreateTrackingInput,
  UpdateTrackingInput,
} from "./tracking.schema.js";
import { SECURITY_LIMITS } from "../../config/security.js";

const TRACKING_COLLECTION = "alumni_tracking";

export function getTrackingCollection(): Collection<AlumniTracking> {
  return getDatabase().collection<AlumniTracking>(TRACKING_COLLECTION);
}

export async function findTrackingByAlumniId(alumniId: ObjectId) {
  const collection = getTrackingCollection();

  return collection
    .find({
      alumniId,
    })
    .sort({
      startDate: -1,
    })
    .limit(SECURITY_LIMITS.maxListResults)
    .toArray();
}

export async function findTrackingById(id: string) {
  if (!ObjectId.isValid(id)) {
    return null;
  }

  const collection = getTrackingCollection();

  return collection.findOne({
    _id: new ObjectId(id),
  });
}

export async function createTracking(
  alumniId: ObjectId,
  data: CreateTrackingInput,
) {
  const collection = getTrackingCollection();

  const now = new Date();

  const tracking: AlumniTracking = {
    alumniId,
    type: data.type,
    title: data.title,
    company: data.company,
    position: data.position,
    institution: data.institution,
    location: data.location,
    startDate: data.startDate,
    endDate: data.endDate,
    description: data.description,
    createdAt: now,
    updatedAt: now,
  };

  const result = await collection.insertOne(tracking);

  return {
    ...tracking,
    _id: result.insertedId,
  };
}

export async function updateTracking(id: string, data: UpdateTrackingInput) {
  if (!ObjectId.isValid(id)) {
    return null;
  }

  const collection = getTrackingCollection();

  const result = await collection.findOneAndUpdate(
    {
      _id: new ObjectId(id),
    },
    {
      $set: {
        ...data,
        updatedAt: new Date(),
      },
    },
    {
      returnDocument: "after",
    },
  );

  return result;
}

export async function deleteTracking(id: string) {
  if (!ObjectId.isValid(id)) {
    return false;
  }

  const collection = getTrackingCollection();

  const result = await collection.deleteOne({
    _id: new ObjectId(id),
  });

  return result.deletedCount > 0;
}

export async function createTrackingIndexes() {
  const collection = getTrackingCollection();

  await collection.createIndex({
    alumniId: 1,
    startDate: -1,
  });

  await collection.createIndex({
    alumniId: 1,
    type: 1,
  });
}
