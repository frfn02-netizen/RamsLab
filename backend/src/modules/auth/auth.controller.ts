import type { Request, Response } from "express";

import { loginSchema } from "./auth.schema.js";
import { login } from "./auth.service.js";
import { verifyAccessToken } from "./auth.utils.js";
import { incrementUserTokenVersion } from "../users/user.repository.js";
import { AUTH_COOKIE_NAME, createCsrfToken, isProduction } from "../../config/security.js";


export async function loginController(
  req: Request,
  res: Response
) {
  try {
    const input =
      loginSchema.parse(req.body);

    const result =
      await login(input);

    res.cookie(
      AUTH_COOKIE_NAME,
      result.token,
      {
        httpOnly: true,
        secure: isProduction(),
        sameSite: "lax",
        path: "/",
        maxAge:
          24 * 60 * 60 * 1000,
      }
    );
    res.cookie("rams_csrf_token", createCsrfToken(), {
      httpOnly: false,
      secure: isProduction(),
      sameSite: "lax",
      path: "/",
      maxAge: 24 * 60 * 60 * 1000,
    });

    return res.json({
      success: true,
      user: result.user,
    });
  } catch {
    return res.status(401).json({
      success: false,
      message: "Invalid email or password",
    });
  }
}

export async function logoutController(
  req: Request,
  res: Response
) {
  const token = req.cookies?.[AUTH_COOKIE_NAME];
  if (typeof token === "string") {
    try {
      const payload = verifyAccessToken(token);
      await incrementUserTokenVersion(payload.userId);
    } catch {
      // Logout is deliberately idempotent and never reveals token state.
    }
  }

  res.clearCookie(
    AUTH_COOKIE_NAME,
    {
      httpOnly: true,
      secure: isProduction(),
      sameSite: "lax",
      path: "/",
    }
  );
  res.clearCookie("rams_csrf_token", {
    secure: isProduction(),
    sameSite: "lax",
    path: "/",
  });

  return res.json({
    success: true,
    message: "Logged out successfully",
  });
}
