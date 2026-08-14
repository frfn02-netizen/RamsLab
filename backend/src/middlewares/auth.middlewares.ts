import type {
  NextFunction,
  Request,
  Response,
} from "express";

import {
  verifyAccessToken,
} from "../modules/auth/auth.utils.js";
import { findUserById } from "../modules/users/user.repository.js";
import { USER_ROLES } from "../modules/users/user.types.js";
import { ObjectId } from "mongodb";
import { AUTH_COOKIE_NAME } from "../config/security.js";

import type {
  JwtPayload,
} from "../modules/auth/auth.types.js";

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const token =
      req.cookies?.[AUTH_COOKIE_NAME];

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

    req.user = {
      userId: user._id!.toString(),
      role: user.role,
      tokenVersion: user.tokenVersion ?? 0,
    };

    return next();
  } catch {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired authentication token",
    });
  }
}
