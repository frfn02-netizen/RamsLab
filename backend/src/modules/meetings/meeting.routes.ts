import { Router, raw } from "express";
import { authenticate } from "../../middlewares/auth.middlewares.js";
import { requireRole } from "../../middlewares/role.middlewares.js";
import {
  checkConflictsController,
  createMeetingController,
  deleteAttachmentController,
  deleteMeetingController,
  getMeetingController,
  getMeetingListController,
  updateMeetingController,
  uploadAttachmentController,
} from "./meeting.controller.js";

const router = Router();

router.use(authenticate, requireRole("ADMIN", "DOSEN"));

router.get("/", getMeetingListController);
router.post("/conflicts/check", checkConflictsController);
router.get("/:id", getMeetingController);
router.post("/", createMeetingController);
router.patch("/:id", updateMeetingController);
router.delete("/:id", deleteMeetingController);
router.post(
  "/:id/attachments",
  raw({ type: "*/*", limit: "20mb" }),
  uploadAttachmentController,
);
router.delete("/:id/attachments/:attachmentId", deleteAttachmentController);

export default router;
