import { Router } from "express";
import { authenticate, } from "../../middlewares/auth.middlewares.js";
import { requireRole, } from "../../middlewares/role.middlewares.js";
import { getDashboardController, } from "./dashboard.controller.js";

const router = Router();

router.get(
  "/",
  authenticate,
  requireRole(
    "ADMIN",
    "DOSEN"
  ),
  getDashboardController
);

export default router;