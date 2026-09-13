import { Router } from "express";

import {
  getPublicIndustrialPartnersController,
  getPublicAlumniController,
  getPublicProjectController,
  getPublicProjectsController,
  getPublicPeopleController,
  getPublicDosenByIdController,
  getPublicUniversityPartnersController,
  getPublicHomepagePartnersController,
} from "./public.controller.js";
import { getPublicDosenController } from "../dosen/dosen.controller.js";
import {
  getPublicResearchAreasController,
  getPublicResearchAreaBySlugController,
} from "../research/research.controller.js";
import { getPublicSiteContentController } from "../site-content/site-content.controller.js";
import { getPublicPublicationListController } from "../publications/publication.controller.js";
import { getPublicResearchHighlightListController } from "../research-highlights/research-highlight.controller.js";
import { getPublicEventListController } from "../events/event.controller.js";
import {
  getPublicPublicServiceDetailController,
  getPublicPublicServiceListController,
  getPublicServiceProjectListPublicController,
} from "../public-service/public-service.controller.js";
import {
  getPublicExpertListController,
  getPublicExpertByIdController,
} from "../experts/expert.controller.js";
import { getPublicHomepageVideosController } from "../videos/video.controller.js";
import { createRateLimiter } from "../../middlewares/rate-limit.middleware.js";
import { SECURITY_LIMITS } from "../../config/security.js";

const router = Router();
router.use(
  createRateLimiter({
    windowMs: SECURITY_LIMITS.apiWindowMs,
    max: SECURITY_LIMITS.maxPublicRequests,
    message: "Too many public API requests",
  }),
);

// ========================================
// PUBLIC PROJECTS
// ========================================

router.get("/projects", getPublicProjectsController);

router.get("/projects/:slug", getPublicProjectController);

// ========================================
// PUBLIC PARTNERS
// ========================================

router.get("/partners/university", getPublicUniversityPartnersController);

router.get("/partners/industrial", getPublicIndustrialPartnersController);

router.get("/partners/homepage", getPublicHomepagePartnersController);

router.get("/research/:slug", getPublicResearchAreaBySlugController);
router.get("/research", getPublicResearchAreasController);

router.get("/dosen", getPublicDosenController);

router.get("/people", getPublicPeopleController);

router.get("/people/:id", getPublicDosenByIdController);

router.get("/publications", getPublicPublicationListController);

router.get("/research-highlights", getPublicResearchHighlightListController);

router.get("/alumni", getPublicAlumniController);

router.get("/events", getPublicEventListController);

router.get("/public-services", getPublicPublicServiceListController);

router.get("/public-services/:id", getPublicPublicServiceDetailController);

router.get(
  "/public-service-projects",
  getPublicServiceProjectListPublicController,
);

router.get("/experts", getPublicExpertListController);

router.get("/experts/:id", getPublicExpertByIdController);

router.get("/homepage-videos", getPublicHomepageVideosController);

router.get("/site-content/:key", getPublicSiteContentController);

export default router;
