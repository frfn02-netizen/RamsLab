import { Router } from "express";

import {
  authenticate,
} from "../../middlewares/auth.middlewares.js";

import {
  requireRole,
} from "../../middlewares/role.middlewares.js";

import {
  createUniversityPartnerController,
  deleteUniversityPartnerController,
  getUniversityPartnerController,
  getUniversityPartnerListController,
  updateUniversityPartnerController,
} from "./partner.controller.js";

const router = Router();


// ========================================
// ADMIN + DOSEN
// ========================================

router.get(
  "/university",
  authenticate,
  requireRole(
    "ADMIN",
    "DOSEN"
  ),
  getUniversityPartnerListController
);

router.get(
  "/university/:id",
  authenticate,
  requireRole(
    "ADMIN",
    "DOSEN"
  ),
  getUniversityPartnerController
);


// ========================================
// ADMIN
// ========================================

router.post(
  "/university",
  authenticate,
  requireRole("ADMIN"),
  createUniversityPartnerController
);

router.patch(
  "/university/:id",
  authenticate,
  requireRole("ADMIN"),
  updateUniversityPartnerController
);

router.delete(
  "/university/:id",
  authenticate,
  requireRole("ADMIN"),
  deleteUniversityPartnerController
);


export default router;