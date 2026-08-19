import { Collection, ObjectId } from "mongodb";
import { getDatabase } from "../../config/database.js";
import { SECURITY_LIMITS } from "../../config/security.js";
import type { CreatePublicationInput, UpdatePublicationInput } from "./publication.schema.js";
import type { Publication } from "./publication.types.js";

const PUBLICATIONS_COLLECTION = "publications";
export const DEFAULT_PUBLICATION_TYPE = "Article";

export class PublicationConflictError extends Error {
  constructor(message = "A publication with the same DOI or title and year already exists") {
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
    : { normalizedTitle: publication.normalizedTitle, year: publication.year, doi: null };
  if (excludeId && ObjectId.isValid(excludeId)) filter._id = { $ne: new ObjectId(excludeId) };
  return filter;
}

async function ensureNoDuplicate(publication: { doi?: string | null; normalizedTitle: string; year: number }, excludeId?: string) {
  const duplicate = await getPublicationsCollection().findOne(duplicateFilter(publication, excludeId), { projection: { _id: 1 } });
  if (duplicate) throw new PublicationConflictError();
}

function toDocument(input: Partial<CreatePublicationInput>, existing?: Publication): Publication {
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
    normalizedTitle: normalizePublicationTitle(input.title ?? existing?.title ?? ""),
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
}

export async function findAllPublications(options?: { search?: string; year?: number; topics?: string[]; methods?: string[]; sort?: "newest" | "oldest"; page?: number; limit?: number }) {
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
  return { items, total, page, limit };
}

export async function findPublicationById(id: string): Promise<Publication | null> {
  if (!ObjectId.isValid(id)) return null;
  return getPublicationsCollection().findOne({ _id: new ObjectId(id) });
}

export async function createPublication(input: CreatePublicationInput): Promise<Publication> {
  const document = toDocument(input);
  await ensureNoDuplicate(document);
  const result = await getPublicationsCollection().insertOne(document);
  return { ...document, _id: result.insertedId };
}

export async function updatePublication(id: string, input: UpdatePublicationInput): Promise<Publication | null> {
  if (!ObjectId.isValid(id)) return null;
  const existing = await findPublicationById(id);
  if (!existing) return null;
  const next = toDocument(input, existing);
  await ensureNoDuplicate(next, id);
  const { _id: _ignoredId, ...updateData } = next;
  return getPublicationsCollection().findOneAndUpdate({ _id: new ObjectId(id) }, { $set: updateData }, { returnDocument: "after" });
}

export async function deletePublication(id: string): Promise<boolean> {
  if (!ObjectId.isValid(id)) return false;
  const result = await getPublicationsCollection().deleteOne({ _id: new ObjectId(id) });
  return result.deletedCount === 1;
}
