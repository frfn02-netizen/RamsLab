import { Router } from "express";
import { authenticate, } from "../../middlewares/auth.middlewares.js";
import { requireRole, } from "../../middlewares/role.middlewares.js";
import { getDashboardController, } from "./dashboard.controller.js";
import { createRateLimiter } from "../../middlewares/rate-limit.middleware.js";
import { SECURITY_LIMITS } from "../../config/security.js";

const router = Router();

router.get(
  "/",
  createRateLimiter({
    windowMs: SECURITY_LIMITS.apiWindowMs,
    max: SECURITY_LIMITS.maxDashboardRequests,
    message: "Too many dashboard requests",
  }),
  authenticate,
  requireRole(
    "ADMIN",
    "DOSEN"
  ),
  getDashboardController
);

export default router;
