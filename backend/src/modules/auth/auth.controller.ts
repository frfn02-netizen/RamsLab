import type { Request, Response } from "express";
import { ZodError } from "zod";

import {
  changePasswordSchema,
  loginSchema,
  registerSchema,
} from "./auth.schema.js";
import { changePassword, login, register } from "./auth.service.js";
import { verifyAccessToken } from "./auth.utils.js";
import { incrementUserTokenVersion } from "../users/user.repository.js";
import {
  AUTH_COOKIE_NAME,
  createCsrfToken,
  isProduction,
} from "../../config/security.js";

function setCsrfCookie(res: Response, csrfToken: string) {
  res.cookie("rams_csrf_token", csrfToken, {
    httpOnly: false,
    secure: isProduction(),
    sameSite: isProduction() ? "none" : "lax",
    path: "/",
    maxAge: 24 * 60 * 60 * 1000,
  });
}

export async function loginController(req: Request, res: Response) {
  try {
    const input = loginSchema.parse(req.body);
    const result = await login(input);

    res.cookie(AUTH_COOKIE_NAME, result.token, {
      httpOnly: true,
      secure: isProduction(),
      sameSite: isProduction() ? "none" : "lax",
      path: "/",
      maxAge: 24 * 60 * 60 * 1000,
    });

    const csrfToken = createCsrfToken();
    setCsrfCookie(res, csrfToken);

    return res.json({
      success: true,
      user: result.user,
      csrfToken,
    });
  } catch {
    return res.status(401).json({
      success: false,
      message: "Invalid email or password",
    });
  }
}

export async function registerController(req: Request, res: Response) {
  try {
    const input = registerSchema.parse(req.body);
    const result = await register(input);

    res.cookie(AUTH_COOKIE_NAME, result.token, {
      httpOnly: true,
      secure: isProduction(),
      sameSite: isProduction() ? "none" : "lax",
      path: "/",
      maxAge: 24 * 60 * 60 * 1000,
    });

    const csrfToken = createCsrfToken();
    setCsrfCookie(res, csrfToken);

    return res.status(201).json({
      success: true,
      user: result.user,
      csrfToken,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        success: false,
        message: "Please correct the highlighted fields",
        errors: error.issues.map(({ path, message }) => ({ path, message })),
      });
    }
    if (
      error instanceof Error &&
      error.message === "Email is already registered"
    ) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists",
      });
    }
    console.error("Failed to register alumni account", error);
    return res.status(500).json({
      success: false,
      message: "Unable to create the account right now",
    });
  }
}

export async function logoutController(req: Request, res: Response) {
  const token = req.cookies?.[AUTH_COOKIE_NAME];

  if (typeof token === "string") {
    try {
      const payload = verifyAccessToken(token);
      await incrementUserTokenVersion(payload.userId);
    } catch {
      // Logout is deliberately idempotent and never reveals token state.
    }
  }

  res.clearCookie(AUTH_COOKIE_NAME, {
    httpOnly: true,
    secure: isProduction(),
    sameSite: isProduction() ? "none" : "lax",
    path: "/",
  });

  res.clearCookie("rams_csrf_token", {
    secure: isProduction(),
    sameSite: isProduction() ? "none" : "lax",
    path: "/",
  });

  return res.json({
    success: true,
    message: "Logged out successfully",
  });
}

export async function changePasswordController(req: Request, res: Response) {
  try {
    if (!req.user)
      return res
        .status(401)
        .json({ success: false, message: "Authentication required" });
    const input = changePasswordSchema.parse(req.body);
    await changePassword(
      req.user.userId,
      input.currentPassword,
      input.newPassword,
    );
    return res.json({
      success: true,
      message: "Password changed successfully",
    });
  } catch {
    return res
      .status(400)
      .json({ success: false, message: "Unable to change password" });
  }
}

export function csrfController(_req: Request, res: Response) {
  const csrfToken = createCsrfToken();
  setCsrfCookie(res, csrfToken);

  return res.json({
    success: true,
    csrfToken,
  });
}
