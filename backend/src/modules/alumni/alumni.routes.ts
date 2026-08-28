import { Router } from "express";

import {
  requireRole,
} from "../../middlewares/role.middlewares.js";

import {
  authenticate,
} from "../../middlewares/auth.middlewares.js";

import {
  createAlumniController,
  createAdminAlumniController,
  deleteAlumniController,
  getAlumniListController,
  getAlumniController,
  getMyAlumniController,
  updateAlumniController,
  updateMyAlumniController,
} from "./alumni.controller.js";

const router = Router();


// ========================================
// ADMIN
// ========================================

router.post(
  "/",
  authenticate,
  requireRole("ADMIN"),
  createAlumniController
);

router.post(
  "/admin",
  authenticate,
  requireRole("ADMIN"),
  createAdminAlumniController
);


// ========================================
// ADMIN + DOSEN
// ========================================

router.get(
  "/",
  authenticate,
  requireRole(
    "ADMIN",
    "DOSEN"
  ),
  getAlumniListController
);


// ========================================
// ALUMNI
// ========================================

router.get(
  "/me",
  authenticate,
  requireRole("ALUMNI"),
  getMyAlumniController
);

router.patch(
  "/me",
  authenticate,
  requireRole("ALUMNI"),
  updateMyAlumniController
);


// ========================================
// ADMIN + DOSEN
// ========================================

router.get(
  "/:id",
  authenticate,
  requireRole(
    "ADMIN",
    "DOSEN"
  ),
  getAlumniController
);


// ========================================
// ADMIN
// ========================================

router.patch(
  "/:id",
  authenticate,
  requireRole("ADMIN"),
  updateAlumniController
);

router.delete("/:id", authenticate, requireRole("ADMIN", "ALUMNI"), deleteAlumniController);


export default router;
