import type {
  Request,
  Response,
} from "express";

import {
  loginSchema,
} from "./auth.schema.js";

import {
  login,
} from "./auth.service.js";

const COOKIE_NAME = "rams_access_token";

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
      COOKIE_NAME,
      result.token,
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 24 * 60 * 60 * 1000,
      }
    );

    return res.json({
      success: true,
      user: result.user,
    });
  } catch (error) {
    return res.status(401).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Authentication failed",
    });
  }
}

export function logoutController(
  _req: Request,
  res: Response
) {
  res.clearCookie(
    COOKIE_NAME,
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    }
  );

  return res.json({
    success: true,
    message: "Logged out successfully",
  });
}