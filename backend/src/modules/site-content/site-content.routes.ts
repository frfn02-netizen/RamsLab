import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middlewares.js";
import { requireRole } from "../../middlewares/role.middlewares.js";
import { getSiteContentController, getSiteContentListController, updateSiteContentController } from "./site-content.controller.js";

const router = Router();
router.use(authenticate, requireRole("ADMIN"));
router.get("/", getSiteContentListController);
router.get("/:key", getSiteContentController);
router.put("/:key", updateSiteContentController);

export default router;
