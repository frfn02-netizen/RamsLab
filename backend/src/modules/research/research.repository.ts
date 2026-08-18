import { Collection, ObjectId } from "mongodb";
import { getDatabase } from "../../config/database.js";
import { SECURITY_LIMITS } from "../../config/security.js";
import type { CreateResearchAreaInput, UpdateResearchAreaInput } from "./research.schema.js";
import type { ResearchArea } from "./research.types.js";

const RESEARCH_AREAS_COLLECTION = "research_areas";

export function getResearchAreasCollection(): Collection<ResearchArea> {
  return getDatabase().collection<ResearchArea>(RESEARCH_AREAS_COLLECTION);
}

export async function findAllResearchAreas(options?: { publishedOnly?: boolean }): Promise<ResearchArea[]> {
  const filter = options?.publishedOnly ? { published: true } : {};
  return getResearchAreasCollection()
    .find(filter)
    .sort({ order: 1, code: 1 })
    .limit(SECURITY_LIMITS.maxListResults)
    .toArray();
}

export async function countResearchAreas(options?: { publishedOnly?: boolean }): Promise<number> {
  const filter = options?.publishedOnly ? { published: true } : {};
  return getResearchAreasCollection().countDocuments(filter);
}

export async function findResearchAreaById(id: string): Promise<ResearchArea | null> {
  if (!ObjectId.isValid(id)) return null;
  return getResearchAreasCollection().findOne({ _id: new ObjectId(id) });
}

export async function findResearchAreaByCodeOrSlug(code: string, slug: string): Promise<ResearchArea | null> {
  return getResearchAreasCollection().findOne({ $or: [{ code }, { slug }] });
}

export async function createResearchArea(input: CreateResearchAreaInput, updatedBy?: string): Promise<ResearchArea> {
  const now = new Date();
  const researchArea: ResearchArea = {
    ...input,
    createdAt: now,
    updatedAt: now,
    ...(updatedBy && ObjectId.isValid(updatedBy) ? { updatedBy: new ObjectId(updatedBy) } : {}),
  };
  const result = await getResearchAreasCollection().insertOne(researchArea);
  return { ...researchArea, _id: result.insertedId };
}

export async function updateResearchArea(id: string, input: UpdateResearchAreaInput, updatedBy?: string): Promise<ResearchArea | null> {
  if (!ObjectId.isValid(id)) return null;
  return getResearchAreasCollection().findOneAndUpdate(
    { _id: new ObjectId(id) },
    { $set: { ...input, updatedAt: new Date(), ...(updatedBy && ObjectId.isValid(updatedBy) ? { updatedBy: new ObjectId(updatedBy) } : {}) } },
    { returnDocument: "after" },
  );
}

export async function deleteResearchArea(id: string): Promise<boolean> {
  if (!ObjectId.isValid(id)) return false;
  const result = await getResearchAreasCollection().deleteOne({ _id: new ObjectId(id) });
  return result.deletedCount === 1;
}
