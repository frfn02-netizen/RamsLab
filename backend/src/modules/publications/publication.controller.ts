import type { Request, Response } from "express";
import { ObjectId } from "mongodb";
import { SECURITY_LIMITS } from "../../config/security.js";
import { createPublicationSchema, updatePublicationSchema } from "./publication.schema.js";
import { createPublication, DEFAULT_PUBLICATION_TYPE, deletePublication, findAllPublications, findPublicationById, PublicationConflictError, updatePublication } from "./publication.repository.js";
import { canModifyPublication } from "./publication.repository.js";
import { findUserById } from "../users/user.repository.js";
import type { Publication } from "./publication.types.js";

async function serialize(publication: Publication, includeAudit = false) {
  const { normalizedTitle: _normalizedTitle, ...response } = publication;
  const audit = includeAudit ? await Promise.all([
    response.createdBy ? findUserById(response.createdBy.toString()) : null,
    response.updatedBy ? findUserById(response.updatedBy.toString()) : null,
  ]) : [null, null];
  return {
    ...response,
    createdBy: response.createdBy?.toString() ?? null,
    updatedBy: response.updatedBy?.toString() ?? null,
    ...(includeAudit ? { createdByEmail: audit[0]?.email ?? null, updatedByEmail: audit[1]?.email ?? null } : {}),
    publicationType: response.publicationType ?? DEFAULT_PUBLICATION_TYPE,
  };
}

function parseList(value: unknown) {
  const values = typeof value === "string" ? [value] : Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
  return values.flatMap((item) => item.split(",")).map((item) => item.trim()).filter(Boolean).slice(0, SECURITY_LIMITS.maxArrayEntries);
}

function parseQuery(req: Request) {
  const search = typeof req.query.search === "string" ? req.query.search.trim() : undefined;
  if (search && search.length > SECURITY_LIMITS.maxSearchLength) throw new Error("Search query is too long");
  const yearValue = req.query.year;
  let year: number | undefined;
  if (yearValue !== undefined) {
    if (typeof yearValue !== "string" || !/^\d+$/.test(yearValue)) throw new Error("Invalid year");
    year = Number(yearValue);
    if (year < 1900 || year > new Date().getFullYear() + 1) throw new Error("Invalid year");
  }
  const page = req.query.page === undefined ? 1 : Number(req.query.page);
  const limit = req.query.limit === undefined ? SECURITY_LIMITS.maxPageSize : Number(req.query.limit);
  if (!Number.isInteger(page) || page < 1 || page > SECURITY_LIMITS.maxPageNumber) throw new Error("Invalid page");
  if (!Number.isInteger(limit) || limit < 1 || limit > SECURITY_LIMITS.maxPageSize) throw new Error("Invalid limit");
  const sort = req.query.sort === "oldest" ? "oldest" : "newest";
  if (req.query.sort !== undefined && req.query.sort !== "newest" && req.query.sort !== "oldest") throw new Error("Invalid sort");
  return { search, year, topics: parseList(req.query.topic), methods: parseList(req.query.method), sort: sort as "newest" | "oldest", page, limit };
}

export async function getPublicationListController(req: Request, res: Response) {
  try {
    const result = await findAllPublications(parseQuery(req));
    return res.json({ success: true, data: await Promise.all(result.items.map((item) => serialize(item, Boolean(req.user)))), total: result.total, page: result.page, limit: result.limit });
  } catch (error: any) {
    if (error?.message?.startsWith("Invalid ") || error?.message === "Search query is too long") return res.status(400).json({ success: false, message: error.message });
    return res.status(500).json({ success: false, message: "Failed to fetch publications" });
  }
}

export async function getPublicationController(req: Request, res: Response) {
  const id = req.params.id as string;
  if (!ObjectId.isValid(id)) return res.status(400).json({ success: false, message: "Invalid publication ID" });
  try {
    const publication = await findPublicationById(id);
    if (!publication) return res.status(404).json({ success: false, message: "Publication not found" });
    return res.json({ success: true, data: await serialize(publication, Boolean(req.user)) });
  } catch {
    return res.status(500).json({ success: false, message: "Failed to fetch publication" });
  }
}

export async function createPublicationController(req: Request, res: Response) {
  try {
    const input = createPublicationSchema.parse(req.body);
    const publication = await createPublication(input, req.user!);
    return res.status(201).json({ success: true, data: await serialize(publication, true) });
  } catch (error: any) {
    if (error?.name === "ZodError") return res.status(400).json({ success: false, message: "Validation failed", errors: error.issues });
    if (error instanceof PublicationConflictError || error?.code === 11000) return res.status(409).json({ success: false, message: error instanceof PublicationConflictError ? error.message : "A publication with the same DOI or normalized title and year already exists" });
    return res.status(500).json({ success: false, message: "Failed to create publication" });
  }
}

export async function updatePublicationController(req: Request, res: Response) {
  const id = req.params.id as string;
  if (!ObjectId.isValid(id)) return res.status(400).json({ success: false, message: "Invalid publication ID" });
  try {
    const input = updatePublicationSchema.parse(req.body);
    const existing = await findPublicationById(id);
    if (!existing) return res.status(404).json({ success: false, message: "Publication not found" });
    if (!canModifyPublication(existing, req.user!)) return res.status(403).json({ success: false, message: "You can only modify publications you created" });
    const publication = await updatePublication(id, input, req.user!);
    if (!publication) return res.status(404).json({ success: false, message: "Publication not found" });
    return res.json({ success: true, data: await serialize(publication, true) });
  } catch (error: any) {
    if (error?.name === "ZodError") return res.status(400).json({ success: false, message: "Validation failed", errors: error.issues });
    if (error instanceof PublicationConflictError || error?.code === 11000) return res.status(409).json({ success: false, message: error instanceof PublicationConflictError ? error.message : "A publication with the same DOI or normalized title and year already exists" });
    return res.status(500).json({ success: false, message: "Failed to update publication" });
  }
}

export async function deletePublicationController(req: Request, res: Response) {
  const id = req.params.id as string;
  if (!ObjectId.isValid(id)) return res.status(400).json({ success: false, message: "Invalid publication ID" });
  try {
    const existing = await findPublicationById(id);
    if (!existing) return res.status(404).json({ success: false, message: "Publication not found" });
    if (!canModifyPublication(existing, req.user!)) return res.status(403).json({ success: false, message: "You can only modify publications you created" });
    const deleted = await deletePublication(id, req.user!);
    if (!deleted) return res.status(404).json({ success: false, message: "Publication not found" });
    return res.json({ success: true, message: "Publication deleted successfully" });
  } catch {
    return res.status(500).json({ success: false, message: "Failed to delete publication" });
  }
}
