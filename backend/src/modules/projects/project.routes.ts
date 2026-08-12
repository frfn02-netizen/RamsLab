import { Router } from "express";
import { authenticate, } from "../../middlewares/auth.middlewares.js";
import { requireRole, } from "../../middlewares/role.middlewares.js";
import { createProjectController, deleteProjectController, getProjectBySlugController, getProjectController, getProjectListController, updateProjectController, } from "./project.controller.js";

const router = Router();


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
  getProjectListController
);

router.get(
  "/slug/:slug",
  authenticate,
  requireRole(
    "ADMIN",
    "DOSEN"
  ),
  getProjectBySlugController
);

router.get(
  "/:id",
  authenticate,
  requireRole(
    "ADMIN",
    "DOSEN"
  ),
  getProjectController
);


// ========================================
// ADMIN
// ========================================

router.post(
  "/",
  authenticate,
  requireRole("ADMIN"),
  createProjectController
);

router.patch(
  "/:id",
  authenticate,
  requireRole("ADMIN"),
  updateProjectController
);

router.delete(
  "/:id",
  authenticate,
  requireRole("ADMIN"),
  deleteProjectController
);


export default router;