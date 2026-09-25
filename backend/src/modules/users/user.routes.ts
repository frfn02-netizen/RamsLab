import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middlewares.js";
import { requireRole } from "../../middlewares/role.middlewares.js";
import { createDosenUserController } from "./user.controller.js";

const router = Router();

router.post(
  "/dosen",
  authenticate,
  requireRole("ADMIN"),
  createDosenUserController,
);

export default router;
