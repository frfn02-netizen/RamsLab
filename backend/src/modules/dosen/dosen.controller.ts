import type { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import { createDosenSchema, updateDosenSchema} from './dosen.schema.js';
import { createDosen, deleteDosen, findAllDosen, findDosenByEmployeeId, findDosenById, updateDosen } from './dosen.repository.js';
import { findUserById } from '../users/user.repository.js';
import { getDosenPhotoUrl, removeDosenPhoto, saveDosenPhoto } from './dosen-photo.js';

const MAX_PHOTO_BYTES = 3 * 1024 * 1024;

// ========================================
// GET ALL DOSEN
// ========================================

export async function getDosenListController(
  _req: Request,
  res: Response
) {
  try {
    const dosen =
      await findAllDosen();

    return res.json({
      success: true,
      data: dosen,
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch dosen",
    });
  }
}


// ========================================
// GET PUBLIC DOSEN
// ========================================

export async function getPublicDosenController(
  _req: Request,
  res: Response
) {
  try {
    const dosen =
      await findAllDosen({
        publicOnly: true,
      });

    return res.json({
      success: true,
      data: dosen,
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch public dosen",
    });
  }
}


// ========================================
// GET DOSEN BY ID
// ========================================

export async function getDosenController(
  req: Request,
  res: Response
) {
  try {
    const id = req.params.id as string;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid dosen ID",
      });
    }

    const dosen =
      await findDosenById(id);

    if (!dosen) {
      return res.status(404).json({
        success: false,
        message: "Dosen not found",
      });
    }

    return res.json({
      success: true,
      data: dosen,
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch dosen",
    });
  }
}

export async function uploadDosenPhotoController(
  req: Request,
  res: Response,
) {
  try {
    const id = req.params.id as string;
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid dosen ID" });
    }

    const dosen = await findDosenById(id);
    if (!dosen) {
      return res.status(404).json({ success: false, message: "Dosen not found" });
    }

    const photo = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
    if (photo.length === 0) {
      return res.status(400).json({ success: false, message: "Photo is required" });
    }
    if (photo.length > MAX_PHOTO_BYTES) {
      return res.status(413).json({ success: false, message: "Photo must be 3 MB or smaller" });
    }

    const filename = await saveDosenPhoto(photo);
    const updated = await updateDosen(id, { photo: getDosenPhotoUrl(req, filename) });
    if (!updated) {
      await removeDosenPhoto(filename);
      return res.status(404).json({ success: false, message: "Dosen not found" });
    }

    await removeDosenPhoto(dosen.photo);
    return res.json({ success: true, data: updated });
  } catch (error) {
    if (error instanceof Error && error.message === "Unsupported image format") {
      return res.status(415).json({ success: false, message: "Only JPG, PNG, and WebP photos are supported" });
    }
    return res.status(500).json({ success: false, message: "Failed to upload dosen photo" });
  }
}


// ========================================
// GET DOSEN BY EMPLOYEE ID
// ========================================

export async function getDosenByEmployeeIdController(
  req: Request,
  res: Response
) {
  try {
    const employeeId = req.params.employeeId as string;
    const dosen =
      await findDosenByEmployeeId(
        employeeId
      );

    if (!dosen) {
      return res.status(404).json({
        success: false,
        message: "Dosen not found",
      });
    }

    return res.json({
      success: true,
      data: dosen,
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch dosen",
    });
  }
}


// ========================================
// CREATE DOSEN
// ========================================

export async function createDosenController(
  req: Request,
  res: Response
) {
  try {
    const input =
      createDosenSchema.parse(
        req.body
      );

    const user = await findUserById(input.userId);
    if (!user || !user.isActive || user.role !== "DOSEN") {
      return res.status(400).json({
        success: false,
        message: "userId must reference an active DOSEN account",
      });
    }

    const dosen =
      await createDosen(input);

    return res.status(201).json({
      success: true,
      data: dosen,
    });
  } catch (error: any) {

    if (
      error?.name === "ZodError"
    ) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: error.issues,
      });
    }

    if (
      error?.code === 11000
    ) {
      return res.status(409).json({
        success: false,
        message:
          "Dosen with this userId or employeeId already exists",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to create dosen",
    });
  }
}


// ========================================
// UPDATE DOSEN
// ========================================

export async function updateDosenController(
  req: Request,
  res: Response
) {
  try {
    const id = req.params.id as string;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid dosen ID",
      });
    }

    const input =
      updateDosenSchema.parse(
        req.body
      );

    const dosen =
      await updateDosen(
        id,
        input
      );

    if (!dosen) {
      return res.status(404).json({
        success: false,
        message: "Dosen not found",
      });
    }

    return res.json({
      success: true,
      data: dosen,
    });
  } catch (error: any) {

    if (
      error?.name === "ZodError"
    ) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: error.issues,
      });
    }

    if (
      error?.code === 11000
    ) {
      return res.status(409).json({
        success: false,
        message:
          "Dosen with this employeeId already exists",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to update dosen",
    });
  }
}


// ========================================
// DELETE DOSEN
// ========================================

export async function deleteDosenController(
  req: Request,
  res: Response
) {
  try {
    const id = req.params.id as string;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid dosen ID",
      });
    }

    const existing = await findDosenById(id);
    const deleted =
      await deleteDosen(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Dosen not found",
      });
    }

    await removeDosenPhoto(existing?.photo);

    return res.json({
      success: true,
      message: "Dosen deleted successfully",
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Failed to delete dosen",
    });
  }
}
