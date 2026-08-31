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
} from "./site-content.types.js";

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
    const document = await updateSiteContent(key, content, req.user?.userId);
    if (!document)
      return res
        .status(404)
        .json({ success: false, message: "Site content not found" });
    return res.json({ success: true, data: adminRepresentation(document) });
  } catch (error: unknown) {
    if (error instanceof ZodError)
      return res
        .status(400)
        .json({
          success: false,
          message: "Validation failed",
          errors: error.issues,
        });
    return res
      .status(500)
      .json({ success: false, message: "Failed to update site content" });
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
