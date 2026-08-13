import { Router } from "express";

import {
  getPublicIndustrialPartnersController,
  getPublicProjectController,
  getPublicProjectsController,
  getPublicUniversityPartnersController,
} from "./public.controller.js";

const router = Router();


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


export default router;