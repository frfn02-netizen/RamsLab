import type { NextFunction, Request, Response } from "express";
import { getAllowedOrigins } from "../config/security.js";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * Cookie-authenticated state changes must originate from a configured UI.
 * SameSite=Lax remains the primary browser control; this origin check is the
 * server-side defense for cross-origin requests that do carry credentials.
 */
export function verifyStateChangingOrigin(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (SAFE_METHODS.has(req.method)) return next();

  const origin = req.get("origin");
  if (origin && !getAllowedOrigins().includes(origin)) {
    return res.status(403).json({
      success: false,
      message: "Cross-origin request denied",
    });
  }

  if (origin && req.cookies?.rams_access_token) {
    const csrfCookie = req.cookies?.rams_csrf_token;
    const csrfHeader = req.get("x-csrf-token");
    if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
      return res.status(403).json({
        success: false,
        message: "CSRF validation failed",
      });
    }
  }

  return next();
}
