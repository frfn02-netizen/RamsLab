import type { Request, Response } from "express";
import { ObjectId } from "mongodb";
import {
  createResearchHighlightSchema,
  updateResearchHighlightSchema,
} from "./research-highlight.schema.js";
import {
  createResearchHighlight,
  deleteResearchHighlight,
  getResearchHighlightById,
  listAdminResearchHighlights,
  listPublicResearchHighlights,
  PublicationReferenceError,
  updateResearchHighlight,
  removeResearchHighlightImage,
  setResearchHighlightImage,
} from "./research-highlight.repository.js";
import {
  removeResearchHighlightImage as removeCloudinaryImage,
  uploadResearchHighlightImage,
} from "../../lib/cloudinary.js";

const MAX_RESEARCH_HIGHLIGHT_IMAGE_BYTES = 3 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function serialize(
  value: Awaited<ReturnType<typeof getResearchHighlightById>>,
  includeAdminFields = false,
) {
  if (!value) return null;
  const publicValue = {
    id: value._id?.toString(),
    headline: value.headline,
    ...(value.image ? { image: value.image } : {}),
    order: value.order,
    publication: value.publication,
  };
  if (!includeAdminFields) return publicValue;
  return {
    ...publicValue,
    publicationId: value.publicationId.toString(),
    published: value.published,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
    ...(value.updatedBy ? { updatedBy: value.updatedBy.toString() } : {}),
  };
}

export async function getPublicResearchHighlightListController(
  _req: Request,
  res: Response,
) {
  try {
    const highlights = await listPublicResearchHighlights();
    return res.json({
      success: true,
      data: highlights.map((highlight) => serialize(highlight)),
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch research highlights",
    });
  }
}

export async function getAdminResearchHighlightListController(
  _req: Request,
  res: Response,
) {
  try {
    const highlights = await listAdminResearchHighlights();
    return res.json({
      success: true,
      data: highlights.map((highlight) => serialize(highlight, true)),
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch research highlights",
    });
  }
}

export async function getAdminResearchHighlightController(
  req: Request,
  res: Response,
) {
  const id = req.params.id as string;
  if (!ObjectId.isValid(id))
    return res
      .status(400)
      .json({ success: false, message: "Invalid research highlight ID" });
  try {
    const highlight = await getResearchHighlightById(id);
    if (!highlight)
      return res
        .status(404)
        .json({ success: false, message: "Research highlight not found" });
    return res.json({ success: true, data: serialize(highlight, true) });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch research highlight",
    });
  }
}

export async function createResearchHighlightController(
  req: Request,
  res: Response,
) {
  try {
    const input = createResearchHighlightSchema.parse(req.body);
    const highlight = await createResearchHighlight(input, req.user?.userId);
    return res.status(201).json({
      success: true,
      data: serialize(highlight, true),
    });
  } catch (error: any) {
    if (error?.name === "ZodError")
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: error.issues,
      });
    if (error instanceof PublicationReferenceError)
      return res.status(400).json({ success: false, message: error.message });
    return res.status(500).json({
      success: false,
      message: "Failed to create research highlight",
    });
  }
}

export async function updateResearchHighlightController(
  req: Request,
  res: Response,
) {
  const id = req.params.id as string;
  if (!ObjectId.isValid(id))
    return res
      .status(400)
      .json({ success: false, message: "Invalid research highlight ID" });
  try {
    const input = updateResearchHighlightSchema.parse(req.body);
    const highlight = await updateResearchHighlight(
      id,
      input,
      req.user?.userId,
    );
    if (!highlight)
      return res
        .status(404)
        .json({ success: false, message: "Research highlight not found" });
    return res.json({ success: true, data: serialize(highlight, true) });
  } catch (error: any) {
    if (error?.name === "ZodError")
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: error.issues,
      });
    if (error instanceof PublicationReferenceError)
      return res.status(400).json({ success: false, message: error.message });
    return res.status(500).json({
      success: false,
      message: "Failed to update research highlight",
    });
  }
}

export async function deleteResearchHighlightController(
  req: Request,
  res: Response,
) {
  const id = req.params.id as string;
  if (!ObjectId.isValid(id))
    return res
      .status(400)
      .json({ success: false, message: "Invalid research highlight ID" });
  try {
    const deleted = await deleteResearchHighlight(id);
    if (!deleted)
      return res
        .status(404)
        .json({ success: false, message: "Research highlight not found" });
    return res.json({
      success: true,
      message: "Research highlight deleted successfully",
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Failed to delete research highlight",
    });
  }
}

export async function uploadResearchHighlightImageController(
  req: Request,
  res: Response,
) {
  const id = req.params.id as string;
  if (!ObjectId.isValid(id)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid research highlight ID" });
  }

  const existing = await getResearchHighlightById(id);
  if (!existing) {
    return res
      .status(404)
      .json({ success: false, message: "Research highlight not found" });
  }

  const contentType = (req.headers["content-type"] ?? "")
    .split(";", 1)[0]
    .trim()
    .toLowerCase();
  const image = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
  if (!ALLOWED_IMAGE_TYPES.has(contentType)) {
    return res.status(415).json({
      success: false,
      message: "Only JPEG, PNG, and WebP images are supported",
    });
  }
  if (!image.length || image.length > MAX_RESEARCH_HIGHLIGHT_IMAGE_BYTES) {
    return res.status(413).json({
      success: false,
      message: "Image must be between 1 byte and 3 MB",
    });
  }

  let uploaded: { url: string; publicId: string };
  try {
    uploaded = await uploadResearchHighlightImage(image);
  } catch {
    return res.status(502).json({
      success: false,
      message: "Research highlight image upload failed",
    });
  }

  let updated;
  try {
    updated = await setResearchHighlightImage(id, uploaded);
    if (!updated) {
      await removeCloudinaryImage(uploaded.publicId).catch(() => undefined);
      return res
        .status(404)
        .json({ success: false, message: "Research highlight not found" });
    }
  } catch {
    await removeCloudinaryImage(uploaded.publicId).catch(() => undefined);
    return res.status(500).json({
      success: false,
      message: "Failed to save research highlight image",
    });
  }

  if (
    existing.image?.publicId &&
    existing.image.publicId !== uploaded.publicId
  ) {
    await removeCloudinaryImage(existing.image.publicId).catch(() => undefined);
  }

  return res.json({ success: true, data: serialize(updated, true) });
}

export async function removeResearchHighlightImageController(
  req: Request,
  res: Response,
) {
  const id = req.params.id as string;
  if (!ObjectId.isValid(id)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid research highlight ID" });
  }

  const existing = await getResearchHighlightById(id);
  if (!existing) {
    return res
      .status(404)
      .json({ success: false, message: "Research highlight not found" });
  }

  try {
    const updated = await removeResearchHighlightImage(id);
    if (!updated) {
      return res
        .status(404)
        .json({ success: false, message: "Research highlight not found" });
    }
    if (existing.image?.publicId) {
      await removeCloudinaryImage(existing.image.publicId).catch(
        () => undefined,
      );
    }
    return res.json({ success: true, data: serialize(updated, true) });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Failed to remove research highlight image",
    });
  }
}
