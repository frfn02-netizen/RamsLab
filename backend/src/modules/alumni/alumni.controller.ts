import type {
  Request,
  Response,
} from "express";

import {
  createAlumni,
  getAlumniById,
  getAlumniByUserId,
  updateAlumni,
  updateMyAlumni,
  getAlumniList,
} from "./alumni.service.js";

import { createAdminAlumni } from "./admin-alumni.service.js";
import { SECURITY_LIMITS } from "../../config/security.js";

export async function createAlumniController(
  req: Request,
  res: Response
) {
  try {
    const alumni =
      await createAlumni(req.body);

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

export async function createAdminAlumniController(
  req: Request,
  res: Response
) {
  try {
    const result =
      await createAdminAlumni(req.body);

    return res.status(201).json({
      success: true,
      data: result,
    });
  } catch {
    return res.status(400).json({
      success: false,
      message: "Failed to create alumni",
    });
  }
}

export async function getAlumniController(
  req: Request,
  res: Response
) {
  try {
    const id = Array.isArray(req.params.id)
      ? req.params.id[0]
      : req.params.id;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Alumni ID is required",
      });
    }

    const alumni =
      await getAlumniById(id);

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

export async function getMyAlumniController(
  req: Request,
  res: Response
) {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const alumni =
      await getAlumniByUserId(
        req.user.userId
      );

    if (!alumni) {
      return res.status(404).json({
        success: false,
        message:
          "Alumni profile not found",
      });
    }

    return res.json({
      success: true,
      data: alumni,
    });
  } catch {
    return res.status(400).json({
      success: false,
      message: "Failed to get profile",
    });
  }
}

export async function updateMyAlumniController(
  req: Request,
  res: Response
) {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const alumni =
      await updateMyAlumni(
        req.user.userId,
        req.body
      );

    if (!alumni) {
      return res.status(404).json({
        success: false,
        message:
          "Alumni profile not found",
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

export async function updateAlumniController(
  req: Request,
  res: Response
) {
  try {
    const id = Array.isArray(req.params.id)
      ? req.params.id[0]
      : req.params.id;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Alumni ID is required",
      });
    }

    const alumni =
      await updateAlumni(
        id,
        req.body
      );

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
export async function getAlumniListController(
  req: Request,
  res: Response
) {
  try {
    const pageParam =
      Array.isArray(req.query.page)
        ? req.query.page[0]
        : req.query.page;

    const limitParam =
      Array.isArray(req.query.limit)
        ? req.query.limit[0]
        : req.query.limit;

    const searchParam =
      Array.isArray(req.query.search)
        ? req.query.search[0]
        : req.query.search;

    const page =
      pageParam
        ? Number(pageParam)
        : 1;

    const limit =
      limitParam
        ? Number(limitParam)
        : 10;

    if (
      !Number.isInteger(page) ||
      page < 1
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Page must be a positive integer",
      });
    }

    if (page > SECURITY_LIMITS.maxPageNumber) {
      return res.status(400).json({
        success: false,
        message: `Page must not exceed ${SECURITY_LIMITS.maxPageNumber}`,
      });
    }

    if (
      !Number.isInteger(limit) ||
      limit < 1
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Limit must be a positive integer",
      });
    }

    if (limit > SECURITY_LIMITS.maxPageSize) {
      return res.status(400).json({
        success: false,
        message: `Limit must not exceed ${SECURITY_LIMITS.maxPageSize}`,
      });
    }

    if (typeof searchParam === "string" && searchParam.length > SECURITY_LIMITS.maxSearchLength) {
      return res.status(400).json({
        success: false,
        message: `Search must not exceed ${SECURITY_LIMITS.maxSearchLength} characters`,
      });
    }

    const result =
      await getAlumniList(
        page,
        limit,
        typeof searchParam === "string"
          ? searchParam
          : undefined
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
