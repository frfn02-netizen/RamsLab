import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middlewares.js";
import { requireRole } from "../../middlewares/role.middlewares.js";
import { createPublicationController, deletePublicationController, getPublicationController, getPublicationListController, updatePublicationController } from "./publication.controller.js";

const router = Router();

router.get("/", getPublicationListController);
router.get("/:id", getPublicationController);

router.post("/", authenticate, requireRole("ADMIN"), createPublicationController);
router.patch("/:id", authenticate, requireRole("ADMIN"), updatePublicationController);
router.delete("/:id", authenticate, requireRole("ADMIN"), deletePublicationController);

export default router;
