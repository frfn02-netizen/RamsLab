import { Router } from "express";
import { authenticate, } from "../../middlewares/auth.middlewares.js";
import { requireRole, } from "../../middlewares/role.middlewares.js";
import { createDosenController, deleteDosenController, getDosenByEmployeeIdController, getDosenController, getDosenListController, updateDosenController, } from "./dosen.controller.js";

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
  getDosenListController
);

router.get(
  "/employee/:employeeId",
  authenticate,
  requireRole(
    "ADMIN",
    "DOSEN"
  ),
  getDosenByEmployeeIdController
);

router.get(
  "/:id",
  authenticate,
  requireRole(
    "ADMIN",
    "DOSEN"
  ),
  getDosenController
);


// ========================================
// ADMIN
// ========================================

router.post(
  "/",
  authenticate,
  requireRole("ADMIN"),
  createDosenController
);

router.patch(
  "/:id",
  authenticate,
  requireRole("ADMIN"),
  updateDosenController
);

router.delete(
  "/:id",
  authenticate,
  requireRole("ADMIN"),
  deleteDosenController
);

export default router;