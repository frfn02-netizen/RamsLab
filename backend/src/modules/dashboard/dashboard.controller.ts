import type { Request, Response } from "express";
import { getDashboardStats } from "./dashboard.service.js";

export async function getDashboardController(_req: Request, res: Response) {
  try {
    const stats = await getDashboardStats();

    return res.json({
      success: true,
      data: stats,
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch dashboard statistics",
    });
  }
}
