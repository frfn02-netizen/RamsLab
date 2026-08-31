import { Router } from "express";

import { authenticate } from "../../middlewares/auth.middlewares.js";

import { requireRole } from "../../middlewares/role.middlewares.js";

import {
  createUniversityPartnerController,
  deleteUniversityPartnerController,
  getUniversityPartnerController,
  getUniversityPartnerListController,
  updateUniversityPartnerController,
  createIndustrialPartnerController,
  deleteIndustrialPartnerController,
  getIndustrialPartnerController,
  getIndustrialPartnerListController,
  updateIndustrialPartnerController,
} from "./partner.controller.js";

const router = Router();

// ========================================
// ADMIN + DOSEN
// ========================================

router.get(
  "/university",
  authenticate,
  requireRole("ADMIN", "DOSEN"),
  getUniversityPartnerListController,
);

router.get(
  "/university/:id",
  authenticate,
  requireRole("ADMIN", "DOSEN"),
  getUniversityPartnerController,
);

// ========================================
// ADMIN
// ========================================

router.post(
  "/university",
  authenticate,
  requireRole("ADMIN"),
  createUniversityPartnerController,
);

router.patch(
  "/university/:id",
  authenticate,
  requireRole("ADMIN"),
  updateUniversityPartnerController,
);

router.delete(
  "/university/:id",
  authenticate,
  requireRole("ADMIN"),
  deleteUniversityPartnerController,
);

// ========================================
// ADMIN + DOSEN
// ========================================

router.get(
  "/industrial",
  authenticate,
  requireRole("ADMIN", "DOSEN"),
  getIndustrialPartnerListController,
);

router.get(
  "/industrial/:id",
  authenticate,
  requireRole("ADMIN", "DOSEN"),
  getIndustrialPartnerController,
);

// ========================================
// ADMIN
// ========================================

router.post(
  "/industrial",
  authenticate,
  requireRole("ADMIN"),
  createIndustrialPartnerController,
);

router.patch(
  "/industrial/:id",
  authenticate,
  requireRole("ADMIN"),
  updateIndustrialPartnerController,
);

router.delete(
  "/industrial/:id",
  authenticate,
  requireRole("ADMIN"),
  deleteIndustrialPartnerController,
);

export default router;
