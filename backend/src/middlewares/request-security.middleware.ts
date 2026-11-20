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
  next: NextFunction,
) {
  if (SAFE_METHODS.has(req.method)) return next();

  const origin = req.get("origin");
  if (origin && !getAllowedOrigins().includes(origin)) {
    return res.status(403).json({
      success: false,
      message: "Cross-origin request denied",
    });
  }

  // Login must be able to replace an expired/stale session. Origin validation
  // still applies, but requiring the old CSRF token here would prevent users
  // from recovering from a mismatched cookie pair.
  const isLoginRequest =
    req.method === "POST" && req.path === "/api/auth/login";

  // Password recovery is token-based, not session-based. A stale access
  // cookie must not prevent a user from requesting or completing a reset. The
  // Origin check above still applies to these POST requests.
  const isPasswordRecoveryRequest =
    req.method === "POST" &&
    (req.path === "/api/auth/forgot-password" ||
      req.path === "/api/auth/reset-password");

  // Requests from browsers carry an Origin header. A CSRF cookie also marks
  // a session created by the login flow, so continue enforcing the
  // double-submit check for those requests even when a non-browser client
  // omits Origin. Direct API/test tokens without a CSRF cookie remain usable
  // for backwards-compatible server-to-server access.
  if (
    req.cookies?.rams_access_token &&
    (origin || req.cookies?.rams_csrf_token) &&
    !isLoginRequest &&
    !isPasswordRecoveryRequest
  ) {
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
