import type { Request, Response } from "express";
import { MongoServerError, ObjectId } from "mongodb";
import { ZodError } from "zod";
import {
  createResearchAreaSchema,
  updateResearchAreaSchema,
} from "./research.schema.js";
import {
  createResearchArea,
  deleteResearchArea,
  findAllResearchAreas,
  findResearchAreaById,
  updateResearchArea,
} from "./research.repository.js";
import type { PublicResearchArea, ResearchArea } from "./research.types.js";
import {
  removeProfilePhoto,
  uploadResearchAreaImage,
} from "../../lib/cloudinary.js";

const MAX_RESEARCH_IMAGE_BYTES = 3 * 1024 * 1024;
const ALLOWED_IMAGE_EXTENSIONS = /\.(jpe?g|png|webp|gif|avif)$/i;

function publicResearchArea(area: ResearchArea): PublicResearchArea {
  const {
    _id: _ignoredId,
    createdAt: _ignoredCreatedAt,
    updatedAt: _ignoredUpdatedAt,
    updatedBy: _ignoredUpdatedBy,
    ...stableData
  } = area;
  return stableData;
}

function adminResearchArea(
  area: ResearchArea,
): Omit<ResearchArea, "updatedBy"> & { updatedBy?: string } {
  const { updatedBy, ...stableData } = area;
  return {
    ...stableData,
    ...(updatedBy ? { updatedBy: updatedBy.toString() } : {}),
  };
}

function validationError(error: unknown): error is ZodError {
  return error instanceof ZodError;
}

function duplicateError(error: unknown): boolean {
  return error instanceof MongoServerError && error.code === 11000;
}

export async function getResearchAreaListController(
  _req: Request,
  res: Response,
) {
  try {
    return res.json({
      success: true,
      data: (await findAllResearchAreas()).map(adminResearchArea),
    });
  } catch {
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch research areas" });
  }
}

export async function getResearchAreaController(req: Request, res: Response) {
  const id = req.params.id as string;
  if (!ObjectId.isValid(id))
    return res
      .status(400)
      .json({ success: false, message: "Invalid research area ID" });
  try {
    const area = await findResearchAreaById(id);
    if (!area)
      return res
        .status(404)
        .json({ success: false, message: "Research area not found" });
    return res.json({ success: true, data: adminResearchArea(area) });
  } catch {
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch research area" });
  }
}

export async function createResearchAreaController(
  req: Request,
  res: Response,
) {
  try {
    const area = await createResearchArea(
      createResearchAreaSchema.parse(req.body),
      req.user?.userId,
    );
    return res
      .status(201)
      .json({ success: true, data: adminResearchArea(area) });
  } catch (error: unknown) {
    if (validationError(error))
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: error.issues,
      });
    if (duplicateError(error))
      return res.status(409).json({
        success: false,
        message: "Research area code or slug already exists",
      });
    return res
      .status(500)
      .json({ success: false, message: "Failed to create research area" });
  }
}

export async function updateResearchAreaController(
  req: Request,
  res: Response,
) {
  const id = req.params.id as string;
  if (!ObjectId.isValid(id))
    return res
      .status(400)
      .json({ success: false, message: "Invalid research area ID" });
  try {
    const existing = await findResearchAreaById(id);
    const area = await updateResearchArea(
      id,
      updateResearchAreaSchema.parse(req.body),
      req.user?.userId,
    );
    if (!area)
      return res
        .status(404)
        .json({ success: false, message: "Research area not found" });
    if (existing?.image && existing.image !== area.image) {
      try {
        await removeProfilePhoto(existing.image);
      } catch {
        // The database now points to the new image; cleanup is best effort.
      }
    }
    return res.json({ success: true, data: adminResearchArea(area) });
  } catch (error: unknown) {
    if (validationError(error))
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: error.issues,
      });
    if (duplicateError(error))
      return res.status(409).json({
        success: false,
        message: "Research area code or slug already exists",
      });
    return res
      .status(500)
      .json({ success: false, message: "Failed to update research area" });
  }
}

export async function uploadResearchAreaImageController(
  req: Request,
  res: Response,
) {
  const image = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
  const contentType = req.headers["content-type"] ?? "";
  const filename =
    typeof req.query.filename === "string" ? req.query.filename : "";
  const id = req.params.id as string;
  if (!ObjectId.isValid(id)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid research area ID" });
  }
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
  if (!image.length || image.length > MAX_RESEARCH_IMAGE_BYTES) {
    return res
      .status(400)
      .json({ success: false, message: "Image must be 3 MB or smaller" });
  }
  try {
    if (!(await findResearchAreaById(id))) {
      return res
        .status(404)
        .json({ success: false, message: "Research area not found" });
    }
    const uploaded = await uploadResearchAreaImage(image);
    return res.json({ success: true, data: uploaded });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Failed to upload research area image",
    });
  }
}

export async function deleteResearchAreaController(
  req: Request,
  res: Response,
) {
  const id = req.params.id as string;
  if (!ObjectId.isValid(id))
    return res
      .status(400)
      .json({ success: false, message: "Invalid research area ID" });
  try {
    if (!(await deleteResearchArea(id)))
      return res
        .status(404)
        .json({ success: false, message: "Research area not found" });
    return res.json({
      success: true,
      message: "Research area deleted successfully",
    });
  } catch {
    return res
      .status(500)
      .json({ success: false, message: "Failed to delete research area" });
  }
}

export async function getPublicResearchAreasController(
  _req: Request,
  res: Response,
) {
  try {
    const areas = await findAllResearchAreas({ publishedOnly: true });
    return res.json({ success: true, data: areas.map(publicResearchArea) });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch public research areas",
    });
  }
}
