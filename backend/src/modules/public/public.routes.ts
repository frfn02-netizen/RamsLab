import { Router } from "express";

import {
  getPublicIndustrialPartnersController,
  getPublicProjectController,
  getPublicProjectsController,
  getPublicUniversityPartnersController,
} from "./public.controller.js";
import { getPublicDosenController } from "../dosen/dosen.controller.js";
import { getPublicResearchAreasController } from "../research/research.controller.js";
import { getPublicSiteContentController } from "../site-content/site-content.controller.js";
import { createRateLimiter } from "../../middlewares/rate-limit.middleware.js";
import { SECURITY_LIMITS } from "../../config/security.js";

const router = Router();
router.use(createRateLimiter({
  windowMs: SECURITY_LIMITS.apiWindowMs,
  max: SECURITY_LIMITS.maxPublicRequests,
  message: "Too many public API requests",
}));


// ========================================
// PUBLIC PROJECTS
// ========================================

router.get(
  "/projects",
  getPublicProjectsController
);

router.get(
  "/projects/:slug",
  getPublicProjectController
);


// ========================================
// PUBLIC PARTNERS
// ========================================

router.get(
  "/partners/university",
  getPublicUniversityPartnersController
);

router.get(
  "/partners/industrial",
  getPublicIndustrialPartnersController
);

router.get(
  "/research",
  getPublicResearchAreasController
);

router.get(
  "/dosen",
  getPublicDosenController
);

router.get(
  "/site-content/:key",
  getPublicSiteContentController
);


export default router;
