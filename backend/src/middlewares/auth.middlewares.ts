import type {
  NextFunction,
  Request,
  Response,
} from "express";

import {
  verifyAccessToken,
} from "../modules/auth/auth.utils.js";

import type {
  JwtPayload,
} from "../modules/auth/auth.types.js";

const COOKIE_NAME = "rams_access_token";

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const token =
      req.cookies?.[COOKIE_NAME];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const payload =
      verifyAccessToken(token);

    req.user = payload;

    next();
  } catch {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired authentication token",
    });
  }
}