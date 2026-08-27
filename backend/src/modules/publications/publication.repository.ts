import { Collection, ObjectId } from "mongodb";
import { getDatabase } from "../../config/database.js";
import { SECURITY_LIMITS } from "../../config/security.js";
import type { CreatePublicationInput, UpdatePublicationInput } from "./publication.schema.js";
import type { Publication } from "./publication.types.js";
import type { JwtPayload } from "../auth/auth.types.js";

const PUBLICATIONS_COLLECTION = "publications";
export const DEFAULT_PUBLICATION_TYPE = "Article";

export class PublicationConflictError extends Error {
  constructor(message = "A publication with the same DOI or normalized title and year already exists") {
    super(message);
    this.name = "PublicationConflictError";
  }
}

export function getPublicationsCollection(): Collection<Publication> {
  return getDatabase().collection<Publication>(PUBLICATIONS_COLLECTION);
}

export function normalizePublicationTitle(title: string) {
  return title.trim().toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

export function normalizeDoi(doi?: string | null) {
  return doi?.trim().toLocaleLowerCase() || null;
}

function duplicateFilter(publication: { doi?: string | null; normalizedTitle: string; year: number }, excludeId?: string) {
  const filter: Record<string, unknown> = publication.doi
    ? { doi: publication.doi }
    : { normalizedTitle: publication.normalizedTitle, year: publication.year };
  if (excludeId && ObjectId.isValid(excludeId)) filter._id = { $ne: new ObjectId(excludeId) };
  return filter;
}

async function ensureNoDuplicate(publication: { doi?: string | null; normalizedTitle: string; year: number }, excludeId?: string) {
  const duplicate = await getPublicationsCollection().findOne(duplicateFilter(publication, excludeId), { projection: { _id: 1 } });
  if (duplicate) {
    throw new PublicationConflictError(publication.doi
      ? "A publication with the same DOI already exists"
      : "A publication with the same normalized title and year already exists");
  }
}

function toDocument(input: Partial<CreatePublicationInput>, actor: JwtPayload, existing?: Publication): Publication {
  const now = new Date();
  const has = (key: keyof CreatePublicationInput) => Object.prototype.hasOwnProperty.call(input, key);
  return {
    ...(existing ?? {}),
    title: input.title ?? existing?.title ?? "",
    authors: input.authors ?? existing?.authors ?? [],
    publicationType: input.publicationType ?? existing?.publicationType ?? DEFAULT_PUBLICATION_TYPE,
    year: input.year ?? existing?.year ?? now.getFullYear(),
    journal: input.journal ?? existing?.journal ?? "",
    doi: normalizeDoi(has("doi") ? input.doi : existing?.doi),
    pdfUrl: has("pdfUrl") ? input.pdfUrl || null : existing?.pdfUrl ?? null,
    topics: input.topics ?? existing?.topics ?? [],
    methods: input.methods ?? existing?.methods ?? [],
    createdBy: existing ? existing.createdBy ?? null : new ObjectId(actor.userId),
    updatedBy: existing ? new ObjectId(actor.userId) : null,
    normalizedTitle: normalizePublicationTitle(input.title ?? existing?.title ?? ""),
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
}

export async function countPublications() {
  return getPublicationsCollection().countDocuments();
}

export async function findAllPublications(options?: { search?: string; year?: number; topics?: string[]; methods?: string[]; sort?: "newest" | "oldest"; page?: number; limit?: number; includeFacets?: boolean }) {
  const filter: Record<string, unknown> = {};
  const and: Record<string, unknown>[] = [];
  const search = options?.search?.trim();
  if (search) {
    const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const expression = { $regex: escaped, $options: "i" };
    and.push({ $or: [{ title: expression }, { authors: expression }, { publicationType: expression }, { journal: expression }, { topics: expression }, { methods: expression }] });
  }
  if (options?.year !== undefined) filter.year = options.year;
  if (options?.topics?.length) filter.topics = { $in: options.topics };
  if (options?.methods?.length) filter.methods = { $in: options.methods };
  if (and.length) filter.$and = and;

  const page = Math.max(1, options?.page ?? 1);
  const limit = Math.min(SECURITY_LIMITS.maxPageSize, Math.max(1, options?.limit ?? SECURITY_LIMITS.maxPageSize));
  const sort = options?.sort === "oldest" ? 1 : -1;
  const collection = getPublicationsCollection();
  const [items, total] = await Promise.all([
    collection.find(filter).sort({ year: sort, title: 1 }).skip((page - 1) * limit).limit(limit).toArray(),
    collection.countDocuments(filter),
  ]);
  if (!options?.includeFacets) return { items, total, page, limit };

  const [years, topics, methods] = await Promise.all([
    collection.distinct("year", filter),
    collection.distinct("topics", filter),
    collection.distinct("methods", filter),
  ]);
  return { items, total, page, limit, facets: {
    years: years.filter((value): value is number => typeof value === "number").sort((a, b) => b - a),
    topics: topics.filter((value): value is string => typeof value === "string" && value.trim().length > 0).sort((a, b) => a.localeCompare(b)),
    methods: methods.filter((value): value is string => typeof value === "string" && value.trim().length > 0).sort((a, b) => a.localeCompare(b)),
  } };
}

export async function findPublicationById(id: string): Promise<Publication | null> {
  if (!ObjectId.isValid(id)) return null;
  return getPublicationsCollection().findOne({ _id: new ObjectId(id) });
}

export async function createPublication(input: CreatePublicationInput, actor: JwtPayload): Promise<Publication> {
  const document = toDocument(input, actor);
  await ensureNoDuplicate(document);
  const result = await getPublicationsCollection().insertOne(document);
  return { ...document, _id: result.insertedId };
}

export function canModifyPublication(publication: Publication, actor: JwtPayload) {
  return actor.role === "ADMIN" || publication.createdBy?.toString() === actor.userId;
}

function actorFilter(id: string, actor: JwtPayload) {
  const filter: Record<string, unknown> = { _id: new ObjectId(id) };
  if (actor.role !== "ADMIN") filter.createdBy = new ObjectId(actor.userId);
  return filter;
}

export async function updatePublication(id: string, input: UpdatePublicationInput, actor: JwtPayload): Promise<Publication | null> {
  if (!ObjectId.isValid(id)) return null;
  const existing = await findPublicationById(id);
  if (!existing) return null;
  const next = toDocument(input, actor, existing);
  await ensureNoDuplicate(next, id);
  const { _id: _ignoredId, ...updateData } = next;
  return getPublicationsCollection().findOneAndUpdate(actorFilter(id, actor), { $set: updateData }, { returnDocument: "after" });
}

export async function deletePublication(id: string, actor: JwtPayload): Promise<boolean> {
  if (!ObjectId.isValid(id)) return false;
  const result = await getPublicationsCollection().deleteOne(actorFilter(id, actor));
  return result.deletedCount === 1;
}
