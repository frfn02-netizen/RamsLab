import { Router, raw } from "express";
import { authenticate } from "../../middlewares/auth.middlewares.js";
import { requireRole } from "../../middlewares/role.middlewares.js";
import {
  getSiteContentController,
  getSiteContentListController,
  updateSiteContentController,
  uploadSiteContentImageController,
} from "./site-content.controller.js";

const router = Router();
router.use(authenticate, requireRole("ADMIN"));
router.get("/", getSiteContentListController);
router.get("/:key", getSiteContentController);
router.put("/:key", updateSiteContentController);
router.post(
  "/image",
  raw({ type: "image/*", limit: "3mb" }),
  uploadSiteContentImageController,
);

export default router;
