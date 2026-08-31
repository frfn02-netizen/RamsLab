import { Router } from "express";

import {
  getTrackingByAlumniId,
  getTrackingById,
  createAlumniTracking,
  updateAlumniTracking,
  deleteAlumniTracking,
} from "./tracking.controller.js";

import { authenticate } from "../../middlewares/auth.middlewares.js";

import { requireRole } from "../../middlewares/role.middlewares.js";

const router = Router();

// ========================================
// ADMIN + DOSEN
// ========================================

router.get(
  "/alumni/:alumniId",
  authenticate,
  requireRole("ADMIN", "DOSEN"),
  getTrackingByAlumniId,
);

router.get(
  "/:id",
  authenticate,
  requireRole("ADMIN", "DOSEN"),
  getTrackingById,
);

// ========================================
// ADMIN
// ========================================

router.post(
  "/alumni/:alumniId",
  authenticate,
  requireRole("ADMIN"),
  createAlumniTracking,
);

router.patch("/:id", authenticate, requireRole("ADMIN"), updateAlumniTracking);

router.delete("/:id", authenticate, requireRole("ADMIN"), deleteAlumniTracking);

export default router;
