import { Request, Response } from "express";
import { ObjectId } from "mongodb";
import {
  findTrackingByAlumniId,
  findTrackingById,
  createTracking,
  updateTracking,
  deleteTracking,
} from "./tracking.respository";
import {
  createTrackingSchema,
  updateTrackingSchema,
} from "./tracking.schema.js";
import { findAlumniById } from "../alumni/alumni.repository.js";

export async function getTrackingByAlumniId(req: Request, res: Response) {
  try {
    const alumniId = String(req.params.alumniId);

    if (!ObjectId.isValid(alumniId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid alumni ID",
      });
    }

    if (!(await findAlumniById(alumniId))) {
      return res.status(404).json({
        success: false,
        message: "Alumni not found",
      });
    }

    const tracking = await findTrackingByAlumniId(new ObjectId(alumniId));

    return res.status(200).json({
      success: true,
      data: tracking,
    });
  } catch (error) {
    console.error("Get tracking by alumni ID error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to get alumni tracking",
    });
  }
}

export async function getTrackingById(req: Request, res: Response) {
  try {
    const id = String(req.params.id);

    const tracking = await findTrackingById(id);

    if (!tracking) {
      return res.status(404).json({
        success: false,
        message: "Tracking not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: tracking,
    });
  } catch (error) {
    console.error("Get tracking by ID error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to get tracking",
    });
  }
}

export async function createAlumniTracking(req: Request, res: Response) {
  try {
    const alumniId = String(req.params.alumniId);

    if (!ObjectId.isValid(alumniId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid alumni ID",
      });
    }

    if (!(await findAlumniById(alumniId))) {
      return res.status(404).json({
        success: false,
        message: "Alumni not found",
      });
    }

    const validation = createTrackingSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validation.error.flatten(),
      });
    }

    const tracking = await createTracking(
      new ObjectId(alumniId),
      validation.data,
    );

    return res.status(201).json({
      success: true,
      message: "Tracking created successfully",
      data: tracking,
    });
  } catch (error) {
    console.error("Create tracking error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create tracking",
    });
  }
}

export async function updateAlumniTracking(req: Request, res: Response) {
  try {
    const id = String(req.params.id);

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid tracking ID",
      });
    }

    const validation = updateTrackingSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validation.error.flatten(),
      });
    }

    const tracking = await updateTracking(id, validation.data);

    if (!tracking) {
      return res.status(404).json({
        success: false,
        message: "Tracking not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Tracking updated successfully",
      data: tracking,
    });
  } catch (error) {
    console.error("Update tracking error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update tracking",
    });
  }
}

export async function deleteAlumniTracking(req: Request, res: Response) {
  try {
    const id = String(req.params.id);

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid tracking ID",
      });
    }

    const deleted = await deleteTracking(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Tracking not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Tracking deleted successfully",
    });
  } catch (error) {
    console.error("Delete tracking error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete tracking",
    });
  }
}
