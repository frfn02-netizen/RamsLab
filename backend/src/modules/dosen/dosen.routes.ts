import express, { Router } from "express";
import { authenticate } from "../../middlewares/auth.middlewares.js";
import { requireRole } from "../../middlewares/role.middlewares.js";
import {
  createDosenController,
  deleteDosenController,
  getDosenByEmployeeIdController,
  getDosenController,
  getDosenListController,
  updateDosenController,
  uploadDosenPhotoController,
} from "./dosen.controller.js";

const router = Router();


router.get("/",
  authenticate, requireRole("ADMIN"), getDosenListController,
);

router.get
(
  "/employee/:employeeId", authenticate, requireRole("ADMIN"), getDosenByEmployeeIdController,
);

router.get
(
  "/:id", authenticate, requireRole("ADMIN"), getDosenController,
);

router.post
(
  "/", authenticate, requireRole("ADMIN"), createDosenController
);

router.patch
(
  "/:id", authenticate, requireRole("ADMIN"), updateDosenController
);

router.post( "/:id/photo", authenticate, requireRole("ADMIN"), express.raw({
    type: ["image/jpeg", "image/png", "image/webp"],
    limit: "3mb",
  }), uploadDosenPhotoController,
);

router.delete
( 
 "/:id", authenticate, requireRole("ADMIN"), deleteDosenController,
);

export default router;
