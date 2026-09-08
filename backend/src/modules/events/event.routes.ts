import { Router, raw } from "express";
import { authenticate } from "../../middlewares/auth.middlewares.js";
import { requireRole } from "../../middlewares/role.middlewares.js";
import {
  createEventController,
  deleteEventController,
  getEventController,
  getEventListController,
  uploadEventImageController,
  updateEventController,
} from "./event.controller.js";

const router = Router();
router.use(authenticate, requireRole("ADMIN"));
router.get("/", getEventListController);
router.get("/:id", getEventController);
router.post("/", createEventController);
router.patch("/:id", updateEventController);
router.post(
  "/:id/image",
  raw({ type: "*/*", limit: "3mb" }),
  uploadEventImageController,
);
router.delete("/:id", deleteEventController);

export default router;
