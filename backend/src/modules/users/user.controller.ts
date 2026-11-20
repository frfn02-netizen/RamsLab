import type { Request, Response } from "express";
import { ObjectId } from "mongodb";
import { adminResetPassword } from "../auth/auth.service.js";
import { HttpError } from "../../middlewares/error.middleware.js";
import { createDosenUser, createStudentUser } from "./user.service.js";
import {
  createManagedAccountSchema,
  createStudentUserSchema,
  updateAgendaManageAccessSchema,
  updateSchedulePortalAccessSchema,
} from "./user.schema.js";
import {
  findActiveUsersDirectory,
  findStudentAccounts,
  setUserAgendaManageAccess,
  setUserSchedulePortalAccess,
} from "./user.repository.js";
import { PERMISSIONS } from "../../middlewares/permission.middlewares.js";

export async function createDosenUserController(req: Request, res: Response) {
  res.setHeader("Cache-Control", "no-store");
  try {
    const parsed = createManagedAccountSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
      });
    }

    const user = await createDosenUser({
      email: parsed.data.email,
      password: parsed.data.password,
    });

    return res.status(201).json({
      success: true,
      data: user,
    });
  } catch (error) {
    const duplicate =
      (typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === 11000) ||
      (error instanceof Error && error.message === "Email is already registered");
    return res.status(duplicate ? 409 : 500).json({
      success: false,
      message: duplicate
        ? "Email is already registered"
        : "Failed to create dosen account",
    });
  }
}

export async function getUserDirectoryController(
  _req: Request,
  res: Response,
) {
  try {
    const users = await findActiveUsersDirectory();
    return res.json({
      success: true,
      data: users.map((user) => ({
        id: user._id?.toString() ?? "",
        displayName:
          user.displayName?.trim() ||
          user.email.split("@", 1)[0] ||
          user.email,
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

export async function resetUserPasswordController(
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

export async function createStudentUserController(req: Request, res: Response) {
  res.setHeader("Cache-Control", "no-store");
  try {
    const parsed = createStudentUserSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
      });
    }

    const user = await createStudentUser(parsed.data);
    return res.status(201).json({ success: true, data: user });
  } catch (error) {
    const duplicate =
      (typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === 11000) ||
      (error instanceof Error && error.message === "Email is already registered");
    return res.status(duplicate ? 409 : 500).json({
      success: false,
      message: duplicate
        ? "Email is already registered"
        : "Failed to create student account",
    });
  }
}

function parseNonNegativeInteger(value: unknown): number | undefined {
  if (typeof value !== "string" || !/^\d+$/.test(value)) return undefined;
  return Number(value);
}

function studentAccountResponse(user: {
  _id?: ObjectId;
  displayName?: string;
  email: string;
  role: string;
  isActive: boolean;
  permissions?: string[];
}) {
  const permissions = Array.isArray(user.permissions) ? user.permissions : [];
  return {
    id: user._id?.toString() ?? "",
    displayName:
      user.displayName?.trim() || user.email.split("@", 1)[0] || user.email,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    permissions,
    hasAgendaManage: permissions.includes(PERMISSIONS.AGENDA_MANAGE),
    hasSchedulePortalAccess: permissions.includes(
      PERMISSIONS.SCHEDULE_PORTAL_ACCESS,
    ),
  };
}

export async function listAgendaCoordinatorStudentsController(
  req: Request,
  res: Response,
) {
  res.setHeader("Cache-Control", "no-store");
  try {
    const query =
      typeof req.query.q === "string" ? req.query.q.trim().slice(0, 200) : "";
    const limit = Math.min(
      Math.max(parseNonNegativeInteger(req.query.limit) ?? 100, 1),
      200,
    );
    const offset = Math.max(
      parseNonNegativeInteger(req.query.offset) ?? 0,
      0,
    );
    const users = await findStudentAccounts({
      query: query || undefined,
      limit,
      offset,
    });
    const hasMore = users.length > limit;
    const page = hasMore ? users.slice(0, limit) : users;

    return res.json({
      success: true,
      data: {
        items: page.map(studentAccountResponse),
        pagination: {
          limit,
          offset,
          hasMore,
          nextOffset: hasMore ? offset + limit : null,
        },
      },
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch student accounts",
    });
  }
}

export async function updateAgendaManageAccessController(
  req: Request,
  res: Response,
) {
  res.setHeader("Cache-Control", "no-store");
  try {
    const id = req.params.id as string;
    if (!ObjectId.isValid(id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid user ID" });
    }
    const parsed = updateAgendaManageAccessSchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ success: false, message: "Validation failed" });
    }

    const updated = await setUserAgendaManageAccess(
      new ObjectId(id),
      parsed.data.enabled,
    );
    if (!updated) {
      return res
        .status(404)
        .json({ success: false, message: "Student account not found" });
    }

    return res.json({
      success: true,
      data: studentAccountResponse(updated),
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Failed to update agenda permission",
    });
  }
}

export async function updateSchedulePortalAccessController(
  req: Request,
  res: Response,
) {
  res.setHeader("Cache-Control", "no-store");
  try {
    const id = req.params.id as string;
    if (!ObjectId.isValid(id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid user ID" });
    }
    const parsed = updateSchedulePortalAccessSchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ success: false, message: "Validation failed" });
    }

    const updated = await setUserSchedulePortalAccess(
      new ObjectId(id),
      parsed.data.enabled,
    );
    if (!updated) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    return res.json({
      success: true,
      data: {
        id: updated._id?.toString() ?? id,
        email: updated.email,
        role: updated.role,
        isActive: updated.isActive,
        permissions: updated.permissions ?? [],
      },
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Failed to update schedule access",
    });
  }
}
