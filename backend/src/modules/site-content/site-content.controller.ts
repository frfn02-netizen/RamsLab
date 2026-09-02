import type { Request, Response } from "express";
import { ZodError } from "zod";
import { siteContentSchemas } from "./site-content.schema.js";
import {
  findAllSiteContent,
  findSiteContentByKey,
  updateSiteContent,
} from "./site-content.repository.js";
import {
  SITE_CONTENT_KEYS,
  type SiteContentContent,
  type SiteContentDocument,
  type SiteContentKey,
  type HomepageContent,
} from "./site-content.types.js";
import {
  removeProfilePhoto,
  uploadSiteContentHomepageImage,
} from "../../lib/cloudinary.js";

const MAX_SITE_CONTENT_IMAGE_BYTES = 3 * 1024 * 1024;
const ALLOWED_IMAGE_EXTENSIONS = /\.(jpe?g|png|webp|gif|avif)$/i;

function isSiteContentKey(value: unknown): value is SiteContentKey {
  return (
    typeof value === "string" &&
    SITE_CONTENT_KEYS.includes(value as SiteContentKey)
  );
}

function adminRepresentation(document: SiteContentDocument) {
  return {
    key: document.key,
    page: document.page,
    content: document.content,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
    ...(document.updatedBy ? { updatedBy: document.updatedBy.toString() } : {}),
  };
}

export async function getSiteContentListController(
  _req: Request,
  res: Response,
) {
  try {
    const documents = await findAllSiteContent();
    return res.json({
      success: true,
      data: documents.map(adminRepresentation),
    });
  } catch {
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch site content" });
  }
}

export async function getSiteContentController(req: Request, res: Response) {
  const key = req.params.key as string;
  if (!isSiteContentKey(key))
    return res
      .status(400)
      .json({ success: false, message: "Invalid site content key" });
  try {
    const document = await findSiteContentByKey(key);
    if (!document)
      return res
        .status(404)
        .json({ success: false, message: "Site content not found" });
    return res.json({ success: true, data: adminRepresentation(document) });
  } catch {
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch site content" });
  }
}

export async function updateSiteContentController(req: Request, res: Response) {
  const key = req.params.key as string;
  if (!isSiteContentKey(key))
    return res
      .status(400)
      .json({ success: false, message: "Invalid site content key" });
  try {
    const content = siteContentSchemas[key].parse(
      req.body?.content,
    ) as SiteContentContent;
    const existing = await findSiteContentByKey(key);
    const document = await updateSiteContent(key, content, req.user?.userId);
    if (!document)
      return res
        .status(404)
        .json({ success: false, message: "Site content not found" });
    const existingHomepage =
      key === "homepage"
        ? (existing?.content as HomepageContent | undefined)
        : undefined;
    const updatedHomepage =
      key === "homepage" ? (content as HomepageContent) : undefined;
    if (
      existingHomepage?.hero.heroImage?.url !==
        updatedHomepage?.hero.heroImage?.url &&
      existingHomepage?.hero.heroImage?.url
    ) {
      try {
        await removeProfilePhoto(existingHomepage.hero.heroImage.url);
      } catch {
        // The database now points to the new image; cleanup is best effort.
      }
    }
    return res.json({ success: true, data: adminRepresentation(document) });
  } catch (error: unknown) {
    if (error instanceof ZodError)
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: error.issues,
      });
    return res
      .status(500)
      .json({ success: false, message: "Failed to update site content" });
  }
}

export async function uploadHomepageImageController(
  req: Request,
  res: Response,
) {
  const image = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
  const contentType = req.headers["content-type"] ?? "";
  const filename =
    typeof req.query.filename === "string" ? req.query.filename : "";
  if (!contentType.startsWith("image/")) {
    return res
      .status(400)
      .json({ success: false, message: "Image file required" });
  }
  if (filename && !ALLOWED_IMAGE_EXTENSIONS.test(filename)) {
    return res
      .status(400)
      .json({ success: false, message: "Unsupported image extension" });
  }
  if (!image.length || image.length > MAX_SITE_CONTENT_IMAGE_BYTES) {
    return res
      .status(400)
      .json({ success: false, message: "Image must be 3 MB or smaller" });
  }
  try {
    const uploaded = await uploadSiteContentHomepageImage(image);
    return res.json({ success: true, data: uploaded });
  } catch {
    return res
      .status(500)
      .json({ success: false, message: "Failed to upload homepage image" });
  }
}

export async function getPublicSiteContentController(
  req: Request,
  res: Response,
) {
  const key = req.params.key as string;
  if (!isSiteContentKey(key))
    return res
      .status(400)
      .json({ success: false, message: "Invalid site content key" });
  try {
    const document = await findSiteContentByKey(key);
    if (!document)
      return res
        .status(404)
        .json({ success: false, message: "Site content not found" });
    return res.json({ success: true, data: document.content });
  } catch {
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch public site content" });
  }
}
