import express, { Router } from "express";

import { authenticate } from "../../middlewares/auth.middlewares.js";
import { requireRole } from "../../middlewares/role.middlewares.js";

import {
  createExpertController,
  deleteExpertController,
  getExpertController,
  getExpertListController,
  updateExpertController,
  uploadExpertPhotoController,
} from "./expert.controller.js";

const router = Router();

// ========================================
// ADMIN
// ========================================

router.get(
  "/",
  authenticate,
  requireRole("ADMIN"),
  getExpertListController,
);

router.get(
  "/:id",
  authenticate,
  requireRole("ADMIN"),
  getExpertController,
);

router.post(
  "/",
  authenticate,
  requireRole("ADMIN"),
  createExpertController,
);

router.patch(
  "/:id",
  authenticate,
  requireRole("ADMIN"),
  updateExpertController,
);

router.delete(
  "/:id",
  authenticate,
  requireRole("ADMIN"),
  deleteExpertController,
);

router.post(
  "/:id/photo",
  authenticate,
  requireRole("ADMIN"),
  express.raw({
    type: ["image/jpeg", "image/png", "image/webp"],
    limit: "3mb",
  }),
  uploadExpertPhotoController,
);

export default router;
