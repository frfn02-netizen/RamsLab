import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middlewares.js";
import {
  PERMISSIONS,
  requirePermission,
} from "../../middlewares/permission.middlewares.js";
import { requireRole } from "../../middlewares/role.middlewares.js";
import { createRateLimiter } from "../../middlewares/rate-limit.middleware.js";
import { SECURITY_LIMITS } from "../../config/security.js";
import {
  createInternalAccountController,
  getNotificationPreferencesController,
  getUserDirectoryController,
  resetUserPasswordController,
  updateNotificationPreferencesController,
} from "./user.controller.js";

const router = Router();

router.get(
  "/me/notification-preferences",
  authenticate,
  getNotificationPreferencesController,
);

router.patch(
  "/me/notification-preferences",
  authenticate,
  updateNotificationPreferencesController,
);

router.post(
  "/internal",
  authenticate,
  requireRole("ADMIN"),
  createInternalAccountController,
);

router.get(
  "/directory",
  authenticate,
  requirePermission(PERMISSIONS.MEETINGS_DIRECTORY_READ),
  getUserDirectoryController,
);

router.post(
  "/:id/password-reset",
  authenticate,
  requireRole("ADMIN"),
  createRateLimiter({
    windowMs: SECURITY_LIMITS.passwordResetWindowMs,
    max: SECURITY_LIMITS.maxAdminPasswordResetsPerActor,
    message: "Too many password reset operations",
    keyGenerator: (req) => req.user?.userId ?? req.ip ?? "unknown",
  }),
  resetUserPasswordController,
);

export default router;
