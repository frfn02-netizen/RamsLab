import type { Request, Response } from "express";
import { createAlumniUser, createDosenUser } from "./user.service.js";
import { createManagedAccountSchema } from "./user.schema.js";

export async function createAlumniUserController(req: Request, res: Response) {
  try {
    const parsed = createManagedAccountSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
      });
    }

    const user = await createAlumniUser({
      email: parsed.data.email,
      password: parsed.data.password,
    });

    return res.status(201).json({
      success: true,
      data: user,
    });
  } catch (error) {
    const duplicate =
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === 11000;
    return res.status(duplicate ? 409 : 500).json({
      success: false,
      message: duplicate
        ? "Email is already registered"
        : "Failed to create alumni account",
    });
  }
}
export async function createDosenUserController(req: Request, res: Response) {
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
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === 11000;
    return res.status(duplicate ? 409 : 500).json({
      success: false,
      message: duplicate
        ? "Email is already registered"
        : "Failed to create dosen account",
    });
  }
}
