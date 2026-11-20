import type { NextFunction, Request, Response } from "express";

import { verifyAccessToken } from "../modules/auth/auth.utils.js";
import { findUserById } from "../modules/users/user.repository.js";
import { USER_ROLES } from "../modules/users/user.types.js";
import { ObjectId } from "mongodb";
import { AUTH_COOKIE_NAME } from "../config/security.js";

import type { JwtPayload } from "../modules/auth/auth.types.js";

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

const PASSWORD_CHANGE_ALLOWED_REQUESTS = new Set([
  "GET /api/auth/me",
  "GET /api/auth/csrf",
  "POST /api/auth/change-password",
  "POST /api/auth/logout",
]);

function normalizeRequestPath(req: Request) {
  const raw = (req.originalUrl ?? req.url).split("?")[0];
  const collapsed = raw.replace(/\/{2,}/g, "/");
  const withoutTrailing =
    collapsed.length > 1 ? collapsed.replace(/\/+$/, "") : collapsed;
  // Express routes case-insensitively by default. Normalize case and trailing
  // slashes only; do not resolve dot segments or decode percent escapes, so
  // ambiguous paths still fail closed.
  return (withoutTrailing || "/").toLowerCase();
}

function isPasswordChangeAllowed(req: Request) {
  return PASSWORD_CHANGE_ALLOWED_REQUESTS.has(
    `${req.method} ${normalizeRequestPath(req)}`,
  );
}

export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const token = req.cookies?.[AUTH_COOKIE_NAME];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const payload = verifyAccessToken(token);

    if (!ObjectId.isValid(payload.userId)) {
      throw new Error("Invalid authenticated user");
    }

    const user = await findUserById(payload.userId);
    if (
      !user ||
      !user.isActive ||
      user.role !== payload.role ||
      (user.tokenVersion ?? 0) !== payload.tokenVersion
    ) {
      throw new Error("Authentication state is no longer valid");
    }

    if (!Object.values(USER_ROLES).includes(user.role)) {
      throw new Error("Invalid user role");
    }

    if (user.mustChangePassword && !isPasswordChangeAllowed(req)) {
      return res.status(403).json({
        success: false,
        code: "PASSWORD_CHANGE_REQUIRED",
        message: "You must change your password before continuing.",
      });
    }

    req.user = {
      userId: user._id!.toString(),
      role: user.role,
      tokenVersion: user.tokenVersion ?? 0,
      permissions: Array.isArray(user.permissions) ? user.permissions : [],
    };

    return next();
  } catch {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired authentication token",
    });
  }
}

export async function optionallyAuthenticate(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  const token = req.cookies?.[AUTH_COOKIE_NAME];
  if (!token) return next();

  try {
    const payload = verifyAccessToken(token);
    if (!ObjectId.isValid(payload.userId)) return next();
    const user = await findUserById(payload.userId);
    if (
      user?.isActive &&
      user.role === payload.role &&
      (user.tokenVersion ?? 0) === payload.tokenVersion &&
      Object.values(USER_ROLES).includes(user.role)
    ) {
      req.user = {
        userId: user._id!.toString(),
        role: user.role,
        tokenVersion: user.tokenVersion ?? 0,
        permissions: Array.isArray(user.permissions) ? user.permissions : [],
      };
    }
  } catch {
    // Public publication reads remain public when a stale cookie is present.
  }

  return next();
}
