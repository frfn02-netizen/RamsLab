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
  createDosenUserController,
  createStudentUserController,
  getUserDirectoryController,
  listAgendaCoordinatorStudentsController,
  resetUserPasswordController,
  updateAgendaManageAccessController,
  updateSchedulePortalAccessController,
} from "./user.controller.js";

const router = Router();

router.get(
  "/directory",
  authenticate,
  requirePermission(
    PERMISSIONS.MEETINGS_DIRECTORY_READ,
    PERMISSIONS.SCHEDULE_PORTAL_ACCESS,
    PERMISSIONS.AGENDA_MANAGE,
  ),
  getUserDirectoryController,
);

router.get(
  "/agenda-coordinators",
  authenticate,
  requireRole("ADMIN"),
  listAgendaCoordinatorStudentsController,
);

router.patch(
  "/:id/agenda-access",
  authenticate,
  requireRole("ADMIN"),
  updateAgendaManageAccessController,
);

router.post(
  "/dosen",
  authenticate,
  requireRole("ADMIN"),
  createDosenUserController,
);

router.post(
  "/student",
  authenticate,
  requireRole("ADMIN"),
  createStudentUserController,
);

router.patch(
  "/:id/schedule-access",
  authenticate,
  requireRole("ADMIN"),
  updateSchedulePortalAccessController,
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
