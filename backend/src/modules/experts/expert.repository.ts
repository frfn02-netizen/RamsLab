import { type Collection } from "mongodb";
import { getDatabase } from "../../config/database.js";
import { SECURITY_LIMITS } from "../../config/security.js";

import type { Expert } from "./expert.types.js";
import type { CreateExpertInput, UpdateExpertInput } from "./expert.schema.js";

const EXPERTS_COLLECTION = "experts";

export function getExpertsCollection(): Collection<Expert> {
  return getDatabase().collection<Expert>(EXPERTS_COLLECTION);
}

// ========================================
// FIND ALL
// ========================================

export async function findAllExperts(options?: {
  publishedOnly?: boolean;
}): Promise<Expert[]> {
  const collection = getExpertsCollection();
  const filter: Record<string, unknown> = {};

  if (options?.publishedOnly) {
    filter.published = true;
  }

  return collection
    .find(filter)
    .sort({ order: 1, name: 1 })
    .limit(SECURITY_LIMITS.maxListResults)
    .toArray();
}

// ========================================
// FIND BY ID
// ========================================

export async function findExpertById(id: string): Promise<Expert | null> {
  const collection = getExpertsCollection();
  const { ObjectId } = await import("mongodb");
  return collection.findOne({ _id: new ObjectId(id) });
}

// ========================================
// CREATE
// ========================================

export async function createExpert(
  input: CreateExpertInput,
): Promise<Expert> {
  const collection = getExpertsCollection();
  const now = new Date();

  const document: Expert = {
    name: input.name,
    title: input.title,
    employeeId: input.employeeId,
    nip: input.nip,
    nidn: input.nidn,
    faculty: input.faculty,
    department: input.department,
    institution: input.institution,
    program: input.program,
    position: input.position,
    phone: input.phone,
    photo: input.photo,
    bio: input.bio,
    linkedin: input.linkedin,
    specialization: input.specialization,
    showNip: input.showNip,
    showNidn: input.showNidn,
    education: input.education,
    sintaUrl: input.sintaUrl,
    googleScholarUrl: input.googleScholarUrl,
    scopusUrl: input.scopusUrl,
    orcidUrl: input.orcidUrl,
    hIndex: input.hIndex,
    publicationCount: input.publicationCount,
    projectCount: input.projectCount,
    awardCount: input.awardCount,
    published: input.published,
    isPublic: input.isPublic,
    order: input.order,
    createdAt: now,
    updatedAt: now,
  };

  const result = await collection.insertOne(document);

  return { ...document, _id: result.insertedId };
}

// ========================================
// UPDATE
// ========================================

export async function updateExpert(
  id: string,
  input: UpdateExpertInput,
): Promise<Expert | null> {
  const collection = getExpertsCollection();
  const { ObjectId } = await import("mongodb");

  const result = await collection.findOneAndUpdate(
    { _id: new ObjectId(id) },
    { $set: { ...input, updatedAt: new Date() } },
    { returnDocument: "after" },
  );

  return result ?? null;
}

// ========================================
// DELETE
// ========================================

export async function deleteExpert(id: string): Promise<boolean> {
  const collection = getExpertsCollection();
  const { ObjectId } = await import("mongodb");

  const result = await collection.deleteOne({ _id: new ObjectId(id) });
  return result.deletedCount > 0;
}

// ========================================
// COUNT
// ========================================

export async function countExperts(): Promise<number> {
  const collection = getExpertsCollection();
  return collection.countDocuments();
}
