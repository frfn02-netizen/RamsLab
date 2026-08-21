import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middlewares.js";
import { requireRole } from "../../middlewares/role.middlewares.js";
import { createStudentController, deleteStudentController, getStudentController, getStudentListController, updateStudentController } from "./student.controller.js";

const router = Router();

router.get("/", authenticate, requireRole("ADMIN", "DOSEN"), getStudentListController);
router.get("/:id", authenticate, requireRole("ADMIN", "DOSEN"), getStudentController);
router.post("/", authenticate, requireRole("ADMIN"), createStudentController);
router.patch("/:id", authenticate, requireRole("ADMIN"), updateStudentController);
router.delete("/:id", authenticate, requireRole("ADMIN"), deleteStudentController);

export default router;
