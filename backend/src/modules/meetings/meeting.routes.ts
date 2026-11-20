import { Router, raw } from "express";
import { authenticate } from "../../middlewares/auth.middlewares.js";
import {
  PERMISSIONS,
  requirePermission,
} from "../../middlewares/permission.middlewares.js";
import { requireRole } from "../../middlewares/role.middlewares.js";
import {
  checkConflictsController,
  cancelMeetingController,
  createMeetingController,
  deleteAttachmentController,
  deleteMeetingController,
  getMeetingController,
  getMeetingAgendaController,
  getMeetingAuditController,
  getMeetingCalendarController,
  getMeetingListController,
  updateMeetingController,
  uploadAttachmentController,
} from "./meeting.controller.js";

const router = Router();

router.use(authenticate);

router.get(
  "/agenda",
  requireRole("ADMIN", "DOSEN", "STUDENT"),
  getMeetingAgendaController,
);
router.get(
  "/calendar",
  requireRole("ADMIN", "DOSEN", "STUDENT"),
  getMeetingCalendarController,
);
router.get(
  "/",
  requirePermission(
    PERMISSIONS.MEETINGS_READ,
    PERMISSIONS.SCHEDULE_PORTAL_ACCESS,
  ),
  getMeetingListController,
);
router.post(
  "/conflicts/check",
  requirePermission(
    PERMISSIONS.MEETINGS_READ,
    PERMISSIONS.SCHEDULE_PORTAL_ACCESS,
    PERMISSIONS.AGENDA_MANAGE,
  ),
  checkConflictsController,
);
router.get("/:id/audit", getMeetingAuditController);
router.get("/:id", getMeetingController);
router.post(
  "/",
  requirePermission(
    PERMISSIONS.MEETINGS_CREATE,
    PERMISSIONS.SCHEDULE_PORTAL_ACCESS,
    PERMISSIONS.AGENDA_MANAGE,
  ),
  createMeetingController,
);
router.patch(
  "/:id",
  requirePermission(
    PERMISSIONS.MEETINGS_MANAGE_OWN,
    PERMISSIONS.SCHEDULE_PORTAL_ACCESS,
    PERMISSIONS.AGENDA_MANAGE,
  ),
  updateMeetingController,
);
router.post(
  "/:id/cancel",
  requirePermission(
    PERMISSIONS.MEETINGS_MANAGE_OWN,
    PERMISSIONS.SCHEDULE_PORTAL_ACCESS,
    PERMISSIONS.AGENDA_MANAGE,
  ),
  cancelMeetingController,
);
router.delete(
  "/:id",
  requirePermission(PERMISSIONS.MEETINGS_MANAGE_OWN),
  deleteMeetingController,
);
router.post(
  "/:id/attachments",
  requirePermission(
    PERMISSIONS.MEETINGS_MANAGE_OWN,
    PERMISSIONS.SCHEDULE_PORTAL_ACCESS,
  ),
  raw({ type: "*/*", limit: "20mb" }),
  uploadAttachmentController,
);
router.delete(
  "/:id/attachments/:attachmentId",
  requirePermission(
    PERMISSIONS.MEETINGS_MANAGE_OWN,
    PERMISSIONS.SCHEDULE_PORTAL_ACCESS,
  ),
  deleteAttachmentController,
);

export default router;
