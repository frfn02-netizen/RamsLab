import type { Request, Response } from "express";
import { MongoServerError, ObjectId } from "mongodb";
import { ZodError } from "zod";

import {
  createAlumni,
  deleteAlumni,
  getAlumniById,
  getAlumniByUserId,
  updateAlumni,
  updateMyAlumni,
  getAlumniList,
  reviewAlumni,
} from "./alumni.service.js";

import { createAdminAlumni } from "./admin-alumni.service.js";
import {
  findAuditLogsByAlumniId,
  findAuditLogsWithUserNames,
} from "./alumni-audit.repository.js";
import { SECURITY_LIMITS } from "../../config/security.js";
import {
  deactivateUser,
  setUserActive,
  getUsersCollection,
} from "../users/user.repository.js";
import {
  removeProfilePhoto,
  uploadProfilePhoto,
} from "../../lib/cloudinary.js";
const MAX_PHOTO_BYTES = 3 * 1024 * 1024;

export async function createAlumniController(req: Request, res: Response) {
  try {
    const alumni = await createAlumni(req.body);

    return res.status(201).json({
      success: true,
      data: alumni,
    });
  } catch {
    return res.status(400).json({
      success: false,
      message: "Failed to create alumni",
    });
  }
}

export async function createAdminAlumniController(req: Request, res: Response) {
  try {
    const result = await createAdminAlumni(req.body);

    return res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        success: false,
        message: "Please correct the highlighted account fields",
        errors: error.issues.map(({ path, message }) => ({ path, message })),
      });
    }
    if (
      error instanceof Error &&
      (error.message === "Email already exists" ||
        error.message === "Email is already registered")
    ) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists",
      });
    }
    if (error instanceof MongoServerError && error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists",
      });
    }
    console.error("Failed to create admin alumni account", error);
    return res.status(500).json({
      success: false,
      message: "Unable to create the alumni account right now",
    });
  }
}

export async function getAlumniController(req: Request, res: Response) {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Alumni ID is required",
      });
    }

    const alumni = await getAlumniById(id);

    if (!alumni) {
      return res.status(404).json({
        success: false,
        message: "Alumni not found",
      });
    }

    return res.json({
      success: true,
      data: alumni,
    });
  } catch {
    return res.status(400).json({
      success: false,
      message: "Failed to get alumni",
    });
  }
}

export async function deleteAlumniController(req: Request, res: Response) {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    if (!id)
      return res
        .status(400)
        .json({ success: false, message: "Alumni ID is required" });
    const existing = await getAlumniById(id);
    if (!existing)
      return res
        .status(404)
        .json({ success: false, message: "Alumni not found" });
    // Do not reveal another profile's existence to an alumni user. The route
    // accepts ALUMNI so this boundary can return the same not-found response
    // as a missing record instead of exposing an authorization distinction.
    if (req.user?.role !== "ADMIN") {
      return res
        .status(404)
        .json({ success: false, message: "Alumni not found" });
    }
    if (!(await deactivateUser(existing.userId)))
      return res.status(500).json({
        success: false,
        message: "Failed to deactivate alumni account",
      });
    if (!(await deleteAlumni(id)))
      return res
        .status(404)
        .json({ success: false, message: "Alumni not found" });
    return res.json({ success: true, message: "Alumni deleted successfully" });
  } catch {
    return res
      .status(400)
      .json({ success: false, message: "Failed to delete alumni" });
  }
}

export async function getMyAlumniController(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const alumni = await getAlumniByUserId(req.user.userId);

    if (!alumni) {
      return res.status(404).json({
        success: false,
        message: "Alumni profile not found",
      });
    }

    const users = getUsersCollection();
    const user = await users.findOne({
      _id: new ObjectId(req.user.userId),
    });

    return res.json({
      success: true,
      data: {
        ...alumni,
        accountEmail: user?.email,
        accountActive: user?.isActive,
        mustChangePassword: user?.mustChangePassword ?? false,
      },
    });
  } catch {
    return res.status(400).json({
      success: false,
      message: "Failed to get profile",
    });
  }
}

export async function updateMyAlumniController(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const alumni = await updateMyAlumni(req.user.userId, req.body);

    if (!alumni) {
      return res.status(404).json({
        success: false,
        message: "Alumni profile not found",
      });
    }

    return res.json({
      success: true,
      data: alumni,
    });
  } catch {
    return res.status(400).json({
      success: false,
      message: "Failed to update profile",
    });
  }
}

export async function uploadMyAlumniPhotoController(
  req: Request,
  res: Response,
) {
  try {
    if (!req.user)
      return res
        .status(401)
        .json({ success: false, message: "Authentication required" });
    const alumni = await getAlumniByUserId(req.user.userId);
    const photo = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
    if (!alumni)
      return res
        .status(404)
        .json({ success: false, message: "Alumni profile not found" });
    if (!photo.length)
      return res
        .status(400)
        .json({ success: false, message: "Photo is required" });
    if (photo.length > MAX_PHOTO_BYTES)
      return res
        .status(413)
        .json({ success: false, message: "Photo must be 3 MB or smaller" });
    const uploaded = await uploadProfilePhoto(photo);
    const updated = await updateMyAlumni(req.user.userId, {
      photo: uploaded.url,
    });
    if (!updated) {
      await removeProfilePhoto(uploaded.url);
      return res
        .status(404)
        .json({ success: false, message: "Alumni profile not found" });
    }
    await removeProfilePhoto(alumni.photo);
    return res.json({ success: true, data: updated });
  } catch (error) {
    if (error instanceof Error && error.message === "Unsupported image format")
      return res.status(415).json({
        success: false,
        message: "Only JPG, PNG, and WebP photos are supported",
      });
    return res
      .status(500)
      .json({ success: false, message: "Failed to upload alumni photo" });
  }
}

export async function updateAlumniController(req: Request, res: Response) {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Alumni ID is required",
      });
    }

    const alumni = await updateAlumni(id, req.body);

    if (!alumni) {
      return res.status(404).json({
        success: false,
        message: "Alumni not found",
      });
    }

    return res.json({
      success: true,
      data: alumni,
    });
  } catch {
    return res.status(400).json({
      success: false,
      message: "Failed to update alumni",
    });
  }
}

export async function setAlumniActiveController(req: Request, res: Response) {
  const id =
    typeof req.params.id === "string" ? req.params.id : req.params.id?.[0];
  const alumni = id ? await getAlumniById(id) : null;
  if (!alumni)
    return res
      .status(404)
      .json({ success: false, message: "Alumni not found" });
  const active = Boolean(req.body?.isActive);
  if (!(await setUserActive(alumni.userId, active)))
    return res
      .status(404)
      .json({ success: false, message: "Account not found" });
  return res.json({ success: true, data: { isActive: active } });
}

export async function reviewAlumniController(req: Request, res: Response) {
  const id =
    typeof req.params.id === "string" ? req.params.id : req.params.id?.[0];
  if (!id)
    return res
      .status(400)
      .json({ success: false, message: "Alumni ID is required" });

  const action = req.body?.action;
  if (action !== "APPROVE" && action !== "REJECT")
    return res
      .status(400)
      .json({ success: false, message: "Review action is required" });

  const alumni = await reviewAlumni(id, action === "APPROVE");
  if (!alumni)
    return res
      .status(404)
      .json({ success: false, message: "Alumni not found" });

  return res.json({ success: true, data: alumni });
}
export async function getAlumniListController(req: Request, res: Response) {
  try {
    const pageParam = Array.isArray(req.query.page)
      ? req.query.page[0]
      : req.query.page;

    const limitParam = Array.isArray(req.query.limit)
      ? req.query.limit[0]
      : req.query.limit;

    const searchParam = Array.isArray(req.query.search)
      ? req.query.search[0]
      : req.query.search;

    const page = pageParam ? Number(pageParam) : 1;

    const limit = limitParam ? Number(limitParam) : 10;

    if (!Number.isInteger(page) || page < 1) {
      return res.status(400).json({
        success: false,
        message: "Page must be a positive integer",
      });
    }

    if (page > SECURITY_LIMITS.maxPageNumber) {
      return res.status(400).json({
        success: false,
        message: `Page must not exceed ${SECURITY_LIMITS.maxPageNumber}`,
      });
    }

    if (!Number.isInteger(limit) || limit < 1) {
      return res.status(400).json({
        success: false,
        message: "Limit must be a positive integer",
      });
    }

    if (limit > SECURITY_LIMITS.maxPageSize) {
      return res.status(400).json({
        success: false,
        message: `Limit must not exceed ${SECURITY_LIMITS.maxPageSize}`,
      });
    }

    if (
      typeof searchParam === "string" &&
      searchParam.length > SECURITY_LIMITS.maxSearchLength
    ) {
      return res.status(400).json({
        success: false,
        message: `Search must not exceed ${SECURITY_LIMITS.maxSearchLength} characters`,
      });
    }

    const result = await getAlumniList(
      page,
      limit,
      typeof searchParam === "string" ? searchParam : undefined,
    );

    return res.json({
      success: true,
      ...result,
    });
  } catch {
    return res.status(400).json({
      success: false,
      message: "Failed to get alumni list",
    });
  }
}

export async function getMyAlumniAuditLogsController(
  req: Request,
  res: Response,
) {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }
    const alumni = await getAlumniByUserId(req.user.userId);
    if (!alumni) {
      return res.status(404).json({
        success: false,
        message: "Alumni profile not found",
      });
    }
    const logs = await findAuditLogsByAlumniId(alumni._id!);
    return res.json({ success: true, data: logs });
  } catch {
    return res.status(400).json({
      success: false,
      message: "Failed to get change history",
    });
  }
}

export async function getAlumniAuditLogsController(
  req: Request,
  res: Response,
) {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    if (!id || !ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid alumni ID",
      });
    }
    const logs = await findAuditLogsWithUserNames(new ObjectId(id));
    return res.json({ success: true, data: logs });
  } catch {
    return res.status(400).json({
      success: false,
      message: "Failed to get audit logs",
    });
  }
}
