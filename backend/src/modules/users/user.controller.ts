import type { Request, Response } from "express";
import { ObjectId } from "mongodb";
import { adminResetPassword } from "../auth/auth.service.js";
import { HttpError } from "../../middlewares/error.middleware.js";
import {
  getNotificationPreferences,
  updateNotificationPreferences,
} from "./user.service.js";
import { updateNotificationPreferencesSchema } from "./user.schema.js";
import { findActiveUsersDirectory } from "./user.repository.js";

export async function getUserDirectoryController(_req: Request, res: Response) {
  try {
    const users = await findActiveUsersDirectory();
    return res.json({
      success: true,
      data: users.map((user) => ({
        id: user._id?.toString() ?? "",
        displayName:
          user.displayName?.trim() || user.email.split("@", 1)[0] || user.email,
        email: user.email,
        role: user.role,
      })),
    });
  } catch {
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch user directory" });
  }
}

function serializeNotificationPreferences(preferences: {
  whatsappNumber: string | null;
  whatsappOptIn: boolean;
  whatsappOptInAt: Date | null;
}) {
  return {
    whatsappNumber: preferences.whatsappNumber,
    whatsappOptIn: preferences.whatsappOptIn,
    whatsappOptInAt: preferences.whatsappOptInAt?.toISOString() ?? null,
  };
}

export async function getNotificationPreferencesController(
  req: Request,
  res: Response,
) {
  res.setHeader("Cache-Control", "no-store");
  try {
    if (!req.user) {
      return res
        .status(401)
        .json({ success: false, message: "Authentication required" });
    }
    if (!ObjectId.isValid(req.user.userId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid user ID" });
    }

    const preferences = await getNotificationPreferences(
      new ObjectId(req.user.userId),
    );
    return res.json({
      success: true,
      data: serializeNotificationPreferences(preferences),
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return res
        .status(error.statusCode)
        .json({ success: false, message: error.message });
    }
    return res.status(500).json({
      success: false,
      message: "Failed to fetch notification preferences",
    });
  }
}

export async function updateNotificationPreferencesController(
  req: Request,
  res: Response,
) {
  res.setHeader("Cache-Control", "no-store");
  try {
    if (!req.user) {
      return res
        .status(401)
        .json({ success: false, message: "Authentication required" });
    }
    if (!ObjectId.isValid(req.user.userId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid user ID" });
    }

    const parsed = updateNotificationPreferencesSchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ success: false, message: "Validation failed" });
    }

    const preferences = await updateNotificationPreferences(
      new ObjectId(req.user.userId),
      parsed.data,
    );
    return res.json({
      success: true,
      data: serializeNotificationPreferences(preferences),
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return res
        .status(error.statusCode)
        .json({ success: false, message: error.message });
    }
    return res.status(500).json({
      success: false,
      message: "Failed to update notification preferences",
    });
  }
}

export async function resetUserPasswordController(req: Request, res: Response) {
  res.setHeader("Cache-Control", "no-store");
  try {
    if (!req.user) {
      return res
        .status(401)
        .json({ success: false, message: "Authentication required" });
    }

    const result = await adminResetPassword(
      req.params.id as string,
      req.user.userId,
      req.ip,
    );

    return res.json({ success: true, data: result });
  } catch (error) {
    if (error instanceof HttpError) {
      return res
        .status(error.statusCode)
        .json({ success: false, message: error.message });
    }
    return res
      .status(500)
      .json({ success: false, message: "Failed to reset password" });
  }
}
