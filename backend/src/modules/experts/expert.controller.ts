import type { Request, Response } from "express";

import { ObjectId } from "mongodb";

import {
  uploadProfilePhoto,
  removeProfilePhoto,
} from "../../lib/cloudinary.js";

import {
  createExpertSchema,
  updateExpertSchema,
} from "./expert.schema.js";

import {
  createExpert,
  deleteExpert,
  findAllExperts,
  findExpertById,
  updateExpert,
} from "./expert.repository.js";

// ========================================
// GET ALL EXPERTS (ADMIN)
// ========================================

export async function getExpertListController(
  _req: Request,
  res: Response,
) {
  try {
    const experts = await findAllExperts();
    return res.json({ success: true, data: experts });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch experts",
    });
  }
}

// ========================================
// GET PUBLIC EXPERTS
// ========================================

export async function getPublicExpertListController(
  _req: Request,
  res: Response,
) {
  try {
    const experts = await findAllExperts({ publishedOnly: true });
    return res.json({ success: true, data: experts });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch experts",
    });
  }
}

// ========================================
// GET PUBLIC EXPERT BY ID
// ========================================

export async function getPublicExpertByIdController(
  req: Request,
  res: Response,
) {
  try {
    const id = String(req.params.id);

    if (!ObjectId.isValid(id)) {
      return res.status(404).json({
        success: false,
        message: "Expert not found",
      });
    }

    const expert = await findExpertById(id);

    if (!expert || !expert.published) {
      return res.status(404).json({
        success: false,
        message: "Expert not found",
      });
    }

    return res.json({ success: true, data: expert });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch expert",
    });
  }
}

// ========================================
// GET EXPERT BY ID (ADMIN)
// ========================================

export async function getExpertController(req: Request, res: Response) {
  try {
    const id = String(req.params.id);

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid expert ID",
      });
    }

    const expert = await findExpertById(id);

    if (!expert) {
      return res.status(404).json({
        success: false,
        message: "Expert not found",
      });
    }

    return res.json({ success: true, data: expert });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch expert",
    });
  }
}

// ========================================
// CREATE EXPERT
// ========================================

export async function createExpertController(
  req: Request,
  res: Response,
) {
  try {
    const parsed = createExpertSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const expert = await createExpert(parsed.data);
    return res.status(201).json({ success: true, data: expert });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Failed to create expert",
    });
  }
}

// ========================================
// UPDATE EXPERT
// ========================================

export async function updateExpertController(
  req: Request,
  res: Response,
) {
  try {
    const id = String(req.params.id);

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid expert ID",
      });
    }

    const parsed = updateExpertSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const updated = await updateExpert(id, parsed.data);

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "Expert not found",
      });
    }

    return res.json({ success: true, data: updated });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Failed to update expert",
    });
  }
}

// ========================================
// DELETE EXPERT
// ========================================

export async function deleteExpertController(
  req: Request,
  res: Response,
) {
  try {
    const id = String(req.params.id);

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid expert ID",
      });
    }

    const deleted = await deleteExpert(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Expert not found",
      });
    }

    return res.json({
      success: true,
      message: "Expert deleted successfully",
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Failed to delete expert",
    });
  }
}

// ========================================
// UPLOAD EXPERT PHOTO
// ========================================

const MAX_PHOTO_BYTES = 3 * 1024 * 1024;

export async function uploadExpertPhotoController(
  req: Request,
  res: Response,
) {
  try {
    const id = String(req.params.id);

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid expert ID",
      });
    }

    const existing = await findExpertById(id);

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Expert not found",
      });
    }

    const photo = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);

    if (photo.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Photo is required",
      });
    }

    if (photo.length > MAX_PHOTO_BYTES) {
      return res.status(413).json({
        success: false,
        message: "Photo must be 3 MB or smaller",
      });
    }

    const uploaded = await uploadProfilePhoto(photo);

    const updated = await updateExpert(id, { photo: uploaded.url });

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "Expert not found",
      });
    }

    return res.json({ success: true, data: updated });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Failed to upload photo",
    });
  }
}
