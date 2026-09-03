import { Router, raw } from "express";
import { authenticate } from "../../middlewares/auth.middlewares.js";
import { requireRole } from "../../middlewares/role.middlewares.js";
import {
  createResearchHighlightController,
  deleteResearchHighlightController,
  getAdminResearchHighlightController,
  getAdminResearchHighlightListController,
  updateResearchHighlightController,
  removeResearchHighlightImageController,
  uploadResearchHighlightImageController,
} from "./research-highlight.controller.js";

const router = Router();

router.use(authenticate, requireRole("ADMIN"));
router.get("/", getAdminResearchHighlightListController);
router.get("/:id", getAdminResearchHighlightController);
router.post("/", createResearchHighlightController);
router.patch("/:id", updateResearchHighlightController);
router.post(
  "/:id/image",
  raw({ type: "*/*", limit: "3mb" }),
  uploadResearchHighlightImageController,
);
router.delete("/:id/image", removeResearchHighlightImageController);
router.delete("/:id", deleteResearchHighlightController);

export default router;
