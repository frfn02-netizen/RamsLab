import { Router, raw } from "express";
import { authenticate } from "../../middlewares/auth.middlewares.js";
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
router.use((_req, res, next) => {
  res.setHeader("Cache-Control", "private, no-store");
  next();
});

const internalOnly = requireRole("ADMIN", "DOSEN");
const meetingMutator = requireRole("ADMIN", "DOSEN");

router.get("/agenda", internalOnly, getMeetingAgendaController);
router.get("/calendar", internalOnly, getMeetingCalendarController);
router.get("/", internalOnly, getMeetingListController);
router.post("/conflicts/check", internalOnly, checkConflictsController);
router.get("/:id/audit", internalOnly, getMeetingAuditController);
router.get("/:id", internalOnly, getMeetingController);
router.post(
  "/",
  meetingMutator,
  createMeetingController,
);
router.patch(
  "/:id",
  meetingMutator,
  updateMeetingController,
);
router.post(
  "/:id/cancel",
  meetingMutator,
  cancelMeetingController,
);
router.delete(
  "/:id",
  meetingMutator,
  deleteMeetingController,
);
router.post(
  "/:id/attachments",
  meetingMutator,
  raw({ type: "*/*", limit: "20mb" }),
  uploadAttachmentController,
);
router.delete(
  "/:id/attachments/:attachmentId",
  meetingMutator,
  deleteAttachmentController,
);

export default router;
