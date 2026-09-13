import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middlewares.js";
import { requireRole } from "../../middlewares/role.middlewares.js";
import {
  createVideoController,
  deleteVideoController,
  getVideoController,
  getVideoListController,
  updateVideoController,
} from "./video.controller.js";

const router = Router();
router.use(authenticate, requireRole("ADMIN"));
router.get("/", getVideoListController);
router.get("/:id", getVideoController);
router.post("/", createVideoController);
router.patch("/:id", updateVideoController);
router.delete("/:id", deleteVideoController);

export default router;
