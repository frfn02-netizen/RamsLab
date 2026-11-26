import type { Request, Response } from "express";
import { ZodError } from "zod";

import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from "./auth.schema.js";
import {
  changePassword,
  login,
  register,
  requestPasswordReset,
  resetPassword,
  PASSWORD_RESET_GENERIC_MESSAGE,
} from "./auth.service.js";
import { generateAccessToken, verifyAccessToken } from "./auth.utils.js";
import { incrementUserTokenVersion } from "../users/user.repository.js";
import {
  AUTH_COOKIE_NAME,
  createCsrfToken,
  isProduction,
} from "../../config/security.js";
import { HttpError } from "../../middlewares/error.middleware.js";

function cookieSecurityOptions() {
  return {
    secure: isProduction(),
    sameSite: (isProduction() ? "none" : "lax") as "none" | "lax",
    path: "/",
  };
}

function authCookieOptions() {
  return {
    ...cookieSecurityOptions(),
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000,
  };
}

function setAuthCookie(res: Response, token: string) {
  res.cookie(AUTH_COOKIE_NAME, token, authCookieOptions());
}

function clearAuthCookie(res: Response) {
  res.clearCookie(AUTH_COOKIE_NAME, cookieSecurityOptions());
}

function setCsrfCookie(res: Response, csrfToken: string) {
  res.cookie("rams_csrf_token", csrfToken, {
    ...cookieSecurityOptions(),
    httpOnly: false,
    maxAge: 24 * 60 * 60 * 1000,
  });
}

function clearCsrfCookie(res: Response) {
  res.clearCookie("rams_csrf_token", cookieSecurityOptions());
}

export async function loginController(req: Request, res: Response) {
  try {
    const input = loginSchema.parse(req.body);
    const result = await login(input);

    setAuthCookie(res, result.token);

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

    setAuthCookie(res, result.token);

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

  clearAuthCookie(res);
  clearCsrfCookie(res);

  return res.json({
    success: true,
    message: "Logged out successfully",
  });
}

export async function changePasswordController(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res
        .status(401)
        .json({ success: false, message: "Authentication required" });
    }

    let input;
    try {
      input = changePasswordSchema.parse(req.body);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          success: false,
          message: "Please correct the highlighted fields",
          errors: error.issues.map(({ path, message }) => ({ path, message })),
        });
      }
      throw error;
    }

    let result;
    try {
      result = await changePassword(
        req.user.userId,
        input.currentPassword,
        input.newPassword,
        req.ip,
      );
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === "Current password is invalid"
      ) {
        return res.status(400).json({
          success: false,
          message: "Current password is incorrect",
        });
      }
      if (
        error instanceof Error &&
        error.message ===
          "New password must be different from the current password"
      ) {
        return res.status(422).json({
          success: false,
          message: "New password must be different from the current password.",
        });
      }
      if (
        error instanceof Error &&
        error.message === "Password changed concurrently"
      ) {
        return res.status(409).json({
          success: false,
          message:
            "Your password was changed by another request. Please sign in again.",
        });
      }
      throw error;
    }

    try {
      const token = generateAccessToken({
        userId: req.user.userId,
        role: req.user.role,
        tokenVersion: result.tokenVersion,
      });
      setAuthCookie(res, token);
      return res.json({
        success: true,
        message: "Password changed successfully",
        reauthenticate: false,
      });
    } catch {
      // The password is already changed and other sessions are revoked. If a
      // new cookie cannot be issued, require a fresh sign-in rather than
      // leaving the client with a revoked session.
      clearAuthCookie(res);
      clearCsrfCookie(res);
      return res.json({
        success: true,
        message: "Password changed. Please sign in again.",
        reauthenticate: true,
      });
    }
  } catch {
    return res.status(500).json({
      success: false,
      message: "Unable to change password",
    });
  }
}

export async function forgotPasswordController(req: Request, res: Response) {
  try {
    const input = forgotPasswordSchema.parse(req.body);
    await requestPasswordReset(input.email);
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address",
        errors: error.issues.map(({ path, message }) => ({ path, message })),
      });
    }
    // Keep the response generic even when delivery or storage fails. This
    // prevents account enumeration and avoids exposing provider state.
    console.error(
      "Password reset request failed",
      error instanceof Error ? error.message : "unknown error",
    );
  }

  return res.json({
    success: true,
    message: PASSWORD_RESET_GENERIC_MESSAGE,
  });
}

export async function resetPasswordController(req: Request, res: Response) {
  try {
    const input = resetPasswordSchema.parse(req.body);
    await resetPassword(input.token, input.newPassword, req.ip);
    clearAuthCookie(res);
    clearCsrfCookie(res);
    return res.json({
      success: true,
      message:
        "Password reset successfully. Please sign in with your new password.",
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        success: false,
        message: "Please correct the highlighted fields",
        errors: error.issues.map(({ path, message }) => ({ path, message })),
      });
    }
    if (error instanceof HttpError) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }
    console.error(
      "Password reset failed",
      error instanceof Error ? error.message : "unknown error",
    );
    return res.status(500).json({
      success: false,
      message: "Unable to reset password",
    });
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
