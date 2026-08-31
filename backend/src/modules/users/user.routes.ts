import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middlewares.js";
import { requireRole } from "../../middlewares/role.middlewares.js";
import {
  createAlumniUserController,
  createDosenUserController,
} from "./user.controller.js";

const router = Router();

router.post(
  "/alumni",
  authenticate,
  requireRole("ADMIN"),
  createAlumniUserController,
);

router.post(
  "/dosen",
  authenticate,
  requireRole("ADMIN"),
  createDosenUserController,
);

export default router;
