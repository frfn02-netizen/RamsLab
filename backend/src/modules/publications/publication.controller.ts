import express, { type Request, type Response } from "express";
import { ObjectId } from "mongodb";
import { SECURITY_LIMITS } from "../../config/security.js";
import {
  createPublicationSchema,
  updatePublicationSchema,
} from "./publication.schema.js";
import {
  createPublication,
  DEFAULT_PUBLICATION_TYPE,
  deletePublication,
  findAllPublications,
  findPublicationById,
  PublicationConflictError,
  PublicationReferencedError,
  updatePublication,
} from "./publication.repository.js";
import { canModifyPublication } from "./publication.repository.js";
import { findUserById } from "../users/user.repository.js";
import type { Publication } from "./publication.types.js";
import { safeHttpUrl } from "../../lib/url-security.js";
import {
  normalizePdfFilename,
  removePublicationPdf,
  uploadPublicationPdf,
} from "../../lib/cloudinary.js";

const MAX_PUBLICATION_PDF_BYTES = 30 * 1024 * 1024;

function originalPdfFilename(req: Request) {
  const value = req.headers["x-original-filename"];
  return normalizePdfFilename(
    typeof value === "string" && value.trim() ? value : "publication.pdf",
  );
}

function pdfContentDisposition(filename: string) {
  const asciiFilename = filename
    .replace(/[^\x20-\x7e]/g, "_")
    .replace(/[\\"]+/g, "_");
  return `inline; filename="${asciiFilename}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}

async function serialize(publication: Publication, includeAudit = false) {
  const {
    normalizedTitle: _normalizedTitle,
    createdBy,
    updatedBy,
    ...publicResponse
  } = publication;
  const audit = includeAudit
    ? await Promise.all([
        createdBy ? findUserById(createdBy.toString()) : null,
        updatedBy ? findUserById(updatedBy.toString()) : null,
      ])
    : [null, null];
  return {
    ...publicResponse,
    pdfUrl: safeHttpUrl(publicResponse.pdfUrl),
    ...(includeAudit
      ? {
          createdBy: createdBy?.toString() ?? null,
          updatedBy: updatedBy?.toString() ?? null,
          createdByEmail: audit[0]?.email ?? null,
          updatedByEmail: audit[1]?.email ?? null,
        }
      : {}),
    publicationType: publicResponse.publicationType ?? DEFAULT_PUBLICATION_TYPE,
  };
}

function canViewPublicationAudit(req: Request) {
  return req.user?.role === "ADMIN" || req.user?.role === "PUBLICATION_EDITOR";
}

function parseList(value: unknown) {
  const values =
    typeof value === "string"
      ? [value]
      : Array.isArray(value)
        ? value.filter((item): item is string => typeof item === "string")
        : [];
  return values
    .flatMap((item) => item.split(","))
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, SECURITY_LIMITS.maxArrayEntries);
}

function parseQuery(req: Request) {
  const search =
    typeof req.query.search === "string" ? req.query.search.trim() : undefined;
  if (search && search.length > SECURITY_LIMITS.maxSearchLength)
    throw new Error("Search query is too long");
  const yearValue = req.query.year;
  let year: number | undefined;
  if (yearValue !== undefined) {
    if (typeof yearValue !== "string" || !/^\d+$/.test(yearValue))
      throw new Error("Invalid year");
    year = Number(yearValue);
    if (year < 1900 || year > new Date().getFullYear() + 1)
      throw new Error("Invalid year");
  }
  const page = req.query.page === undefined ? 1 : Number(req.query.page);
  const limit =
    req.query.limit === undefined
      ? SECURITY_LIMITS.maxPageSize
      : Number(req.query.limit);
  if (
    !Number.isInteger(page) ||
    page < 1 ||
    page > SECURITY_LIMITS.maxPageNumber
  )
    throw new Error("Invalid page");
  if (
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > SECURITY_LIMITS.maxPageSize
  )
    throw new Error("Invalid limit");
  const sort = req.query.sort === "oldest" ? "oldest" : "newest";
  if (
    req.query.sort !== undefined &&
    req.query.sort !== "newest" &&
    req.query.sort !== "oldest"
  )
    throw new Error("Invalid sort");
  return {
    search,
    year,
    topics: parseList(req.query.topic),
    methods: parseList(req.query.method),
    sort: sort as "newest" | "oldest",
    page,
    limit,
  };
}

export async function getPublicationListController(
  req: Request,
  res: Response,
) {
  try {
    const result = await findAllPublications({
      ...parseQuery(req),
      includeFacets: true,
    });
    return res.json({
      success: true,
      data: await Promise.all(
        result.items.map((item) =>
          serialize(item, canViewPublicationAudit(req)),
        ),
      ),
      total: result.total,
      page: result.page,
      limit: result.limit,
      facets: result.facets,
    });
  } catch (error: any) {
    if (
      error?.message?.startsWith("Invalid ") ||
      error?.message === "Search query is too long"
    )
      return res.status(400).json({ success: false, message: error.message });
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch publications" });
  }
}

export async function getPublicPublicationListController(
  req: Request,
  res: Response,
) {
  try {
    const result = await findAllPublications({
      ...parseQuery(req),
      includeFacets: true,
    });
    return res.json({
      success: true,
      data: await Promise.all(
        result.items.map((item) => serialize(item, false)),
      ),
      total: result.total,
      page: result.page,
      limit: result.limit,
      facets: result.facets,
    });
  } catch (error: any) {
    if (
      error?.message?.startsWith("Invalid ") ||
      error?.message === "Search query is too long"
    )
      return res.status(400).json({ success: false, message: error.message });
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch publications" });
  }
}

export async function getPublicationController(req: Request, res: Response) {
  const id = req.params.id as string;
  if (!ObjectId.isValid(id))
    return res
      .status(400)
      .json({ success: false, message: "Invalid publication ID" });
  try {
    const publication = await findPublicationById(id);
    if (!publication)
      return res
        .status(404)
        .json({ success: false, message: "Publication not found" });
    return res.json({
      success: true,
      data: await serialize(publication, canViewPublicationAudit(req)),
    });
  } catch {
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch publication" });
  }
}

export async function createPublicationController(req: Request, res: Response) {
  try {
    const input = createPublicationSchema.parse(req.body);
    const publication = await createPublication(input, req.user!);
    return res
      .status(201)
      .json({ success: true, data: await serialize(publication, true) });
  } catch (error: any) {
    if (error?.name === "ZodError")
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: error.issues,
      });
    if (error instanceof PublicationConflictError || error?.code === 11000)
      return res.status(409).json({
        success: false,
        message:
          error instanceof PublicationConflictError
            ? error.message
            : "A publication with the same DOI or normalized title and year already exists",
      });
    return res
      .status(500)
      .json({ success: false, message: "Failed to create publication" });
  }
}

export async function updatePublicationController(req: Request, res: Response) {
  const id = req.params.id as string;
  if (!ObjectId.isValid(id))
    return res
      .status(400)
      .json({ success: false, message: "Invalid publication ID" });
  try {
    const input = updatePublicationSchema.parse(req.body);
    const existing = await findPublicationById(id);
    if (!existing)
      return res
        .status(404)
        .json({ success: false, message: "Publication not found" });
    if (!canModifyPublication(existing, req.user!))
      return res.status(403).json({
        success: false,
        message: "You can only modify publications you created",
      });
    const publication = await updatePublication(id, input, req.user!);
    if (!publication)
      return res
        .status(404)
        .json({ success: false, message: "Publication not found" });
    return res.json({
      success: true,
      data: await serialize(publication, true),
    });
  } catch (error: any) {
    if (error?.name === "ZodError")
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: error.issues,
      });
    if (error instanceof PublicationConflictError || error?.code === 11000)
      return res.status(409).json({
        success: false,
        message:
          error instanceof PublicationConflictError
            ? error.message
            : "A publication with the same DOI or normalized title and year already exists",
      });
    return res
      .status(500)
      .json({ success: false, message: "Failed to update publication" });
  }
}

export async function deletePublicationController(req: Request, res: Response) {
  const id = req.params.id as string;
  if (!ObjectId.isValid(id))
    return res
      .status(400)
      .json({ success: false, message: "Invalid publication ID" });
  try {
    const existing = await findPublicationById(id);
    if (!existing)
      return res
        .status(404)
        .json({ success: false, message: "Publication not found" });
    if (!canModifyPublication(existing, req.user!))
      return res.status(403).json({
        success: false,
        message: "You can only modify publications you created",
      });
    const deleted = await deletePublication(id, req.user!);
    if (!deleted)
      return res
        .status(404)
        .json({ success: false, message: "Publication not found" });
    return res.json({
      success: true,
      message: "Publication deleted successfully",
    });
  } catch (error: any) {
    if (error instanceof PublicationReferencedError)
      return res.status(409).json({
        success: false,
        message: error.message,
      });
    return res
      .status(500)
      .json({ success: false, message: "Failed to delete publication" });
  }
}

export async function uploadPublicationPdfController(
  req: Request,
  res: Response,
) {
  const id = req.params.id as string;
  if (!ObjectId.isValid(id))
    return res
      .status(400)
      .json({ success: false, message: "Invalid publication ID" });

  const contentType = (req.headers["content-type"] ?? "")
    .split(";", 1)[0]
    .trim()
    .toLowerCase();
  if (contentType !== "application/pdf")
    return res
      .status(415)
      .json({ success: false, message: "Only PDF files are supported" });

  const pdf = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
  if (!pdf.length)
    return res.status(400).json({ success: false, message: "PDF is required" });
  if (pdf.length > MAX_PUBLICATION_PDF_BYTES)
    return res.status(413).json({
      success: false,
      message: "PDF must be 30 MB or smaller",
    });

  try {
    const publication = await findPublicationById(id);
    if (!publication)
      return res
        .status(404)
        .json({ success: false, message: "Publication not found" });

    const filename = originalPdfFilename(req);
    const uploaded = await uploadPublicationPdf(pdf, filename);
    let updated: Publication | null;
    try {
      updated = await updatePublication(
        id,
        { pdfUrl: uploaded.url, pdfFilename: uploaded.filename },
        req.user!,
      );
    } catch (error) {
      try {
        await removePublicationPdf(uploaded.url);
      } catch {
        // The database was not updated; cleanup is best effort.
      }
      throw error;
    }

    if (!updated) {
      try {
        await removePublicationPdf(uploaded.url);
      } catch {
        // The database was not updated; cleanup is best effort.
      }
      return res
        .status(404)
        .json({ success: false, message: "Publication not found" });
    }

    if (publication.pdfUrl && publication.pdfUrl !== updated.pdfUrl) {
      try {
        await removePublicationPdf(publication.pdfUrl);
      } catch {
        // The new PDF is already stored; old-file cleanup is best effort.
      }
    }

    return res.json({ success: true, data: await serialize(updated, true) });
  } catch (error: any) {
    if (error?.name === "ApiError")
      return res.status(error.status || 500).json({
        success: false,
        message: error.message,
      });
    return res.status(500).json({
      success: false,
      message: "Failed to upload publication PDF",
    });
  }
}

export async function uploadTemporaryPublicationPdfController(
  req: Request,
  res: Response,
) {
  const contentType = (req.headers["content-type"] ?? "")
    .split(";", 1)[0]
    .trim()
    .toLowerCase();
  if (contentType !== "application/pdf")
    return res
      .status(415)
      .json({ success: false, message: "Only PDF files are supported" });

  const pdf = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
  if (!pdf.length)
    return res.status(400).json({ success: false, message: "PDF is required" });
  if (pdf.length > MAX_PUBLICATION_PDF_BYTES)
    return res.status(413).json({
      success: false,
      message: "PDF must be 30 MB or smaller",
    });

  try {
    const uploaded = await uploadPublicationPdf(pdf, originalPdfFilename(req));
    return res.status(201).json({
      success: true,
      data: {
        url: uploaded.url,
        publicId: uploaded.publicId,
        filename: uploaded.filename,
      },
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Failed to upload publication PDF",
    });
  }
}

export async function getPublicPublicationPdfController(
  req: Request,
  res: Response,
) {
  const id = req.params.id as string;
  if (!ObjectId.isValid(id))
    return res
      .status(400)
      .json({ success: false, message: "Invalid publication ID" });

  try {
    const publication = await findPublicationById(id);
    const pdfUrl = publication ? safeHttpUrl(publication.pdfUrl) : null;
    if (!publication || !pdfUrl)
      return res
        .status(404)
        .json({ success: false, message: "Publication PDF not found" });

    const url = new URL(pdfUrl);
    if (url.hostname.toLowerCase() !== "res.cloudinary.com") {
      return res.redirect(302, pdfUrl);
    }

    const upstream = await fetch(pdfUrl, { redirect: "error" });
    if (!upstream.ok || !upstream.body)
      return res
        .status(502)
        .json({ success: false, message: "Publication PDF is unavailable" });

    // Cloudinary raw assets uploaded without a file extension can be served as
    // application/octet-stream and with attachment disposition. The stored
    // Publication URL is still authoritative, so verify the actual payload
    // before normalizing the response for browser preview.
    const content = Buffer.from(await upstream.arrayBuffer());
    if (content.subarray(0, 5).toString("ascii") !== "%PDF-")
      return res
        .status(502)
        .json({ success: false, message: "Publication PDF is unavailable" });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      pdfContentDisposition(publication.pdfFilename || "publication.pdf"),
    );
    res.setHeader("Content-Length", content.length);
    res.end(content);
    return undefined;
  } catch {
    return res
      .status(502)
      .json({ success: false, message: "Publication PDF is unavailable" });
  }
}
