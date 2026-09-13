import express, { Router } from "express";

import { requireRole } from "../../middlewares/role.middlewares.js";

import { authenticate } from "../../middlewares/auth.middlewares.js";

import {
  createAlumniController,
  createAdminAlumniController,
  deleteAlumniController,
  getAlumniListController,
  getAlumniController,
  getMyAlumniController,
  updateAlumniController,
  updateMyAlumniController,
  uploadMyAlumniPhotoController,
  setAlumniActiveController,
  getMyAlumniAuditLogsController,
  getAlumniAuditLogsController,
} from "./alumni.controller.js";

const router = Router();

// ========================================
// ADMIN
// ========================================

router.post("/", authenticate, requireRole("ADMIN"), createAlumniController);

router.post(
  "/admin",
  authenticate,
  requireRole("ADMIN"),
  createAdminAlumniController,
);

// ========================================
// ADMIN + DOSEN
// ========================================

router.get(
  "/",
  authenticate,
  requireRole("ADMIN", "DOSEN"),
  getAlumniListController,
);

// ========================================
// ALUMNI
// ========================================

router.get("/me", authenticate, requireRole("ALUMNI"), getMyAlumniController);

router.get(
  "/me/history",
  authenticate,
  requireRole("ALUMNI"),
  getMyAlumniAuditLogsController,
);

router.patch(
  "/me",
  authenticate,
  requireRole("ALUMNI"),
  updateMyAlumniController,
);
router.patch(
  "/:id/account-status",
  authenticate,
  requireRole("ADMIN"),
  setAlumniActiveController,
);
router.post(
  "/me/photo",
  authenticate,
  requireRole("ALUMNI"),
  express.raw({
    type: ["image/jpeg", "image/png", "image/webp"],
    limit: "3mb",
  }),
  uploadMyAlumniPhotoController,
);

// ========================================
// ADMIN + DOSEN
// ========================================

router.get(
  "/:id",
  authenticate,
  requireRole("ADMIN", "DOSEN"),
  getAlumniController,
);

router.get(
  "/:id/history",
  authenticate,
  requireRole("ADMIN", "DOSEN"),
  getAlumniAuditLogsController,
);

// ========================================
// ADMIN
// ========================================

router.patch(
  "/:id",
  authenticate,
  requireRole("ADMIN"),
  updateAlumniController,
);

router.delete(
  "/:id",
  authenticate,
  requireRole("ADMIN", "ALUMNI"),
  deleteAlumniController,
);

export default router;
