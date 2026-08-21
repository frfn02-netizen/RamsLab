import express, { Router } from "express";
import { authenticate } from "../../middlewares/auth.middlewares.js";
import { requireRole } from "../../middlewares/role.middlewares.js";
import { createStudentController, deleteStudentController, getStudentController, getStudentListController, updateStudentController, uploadStudentPhotoController } from "./student.controller.js";

const router = Router();

router.get("/", authenticate, requireRole("ADMIN", "DOSEN"), getStudentListController);
router.get("/:id", authenticate, requireRole("ADMIN", "DOSEN"), getStudentController);
router.post("/", authenticate, requireRole("ADMIN"), createStudentController);
router.patch("/:id", authenticate, requireRole("ADMIN"), updateStudentController);
router.post(
  "/:id/photo",
  authenticate,
  requireRole("ADMIN"),
  express.raw({ type: ["image/jpeg", "image/png", "image/webp"], limit: "3mb" }),
  uploadStudentPhotoController,
);
router.delete("/:id", authenticate, requireRole("ADMIN"), deleteStudentController);

export default router;
