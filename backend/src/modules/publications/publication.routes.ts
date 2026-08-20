import { Router } from "express";
import { authenticate, optionallyAuthenticate } from "../../middlewares/auth.middlewares.js";
import { PERMISSIONS, requirePermission } from "../../middlewares/permission.middlewares.js";
import { createPublicationController, deletePublicationController, getPublicationController, getPublicationListController, updatePublicationController } from "./publication.controller.js";

const router = Router();

router.get("/", optionallyAuthenticate, getPublicationListController);
router.get("/:id", optionallyAuthenticate, getPublicationController);

router.post("/", authenticate, requirePermission(PERMISSIONS.PUBLICATION_CREATE), createPublicationController);
router.patch("/:id", authenticate, requirePermission(PERMISSIONS.PUBLICATION_UPDATE), updatePublicationController);
router.delete("/:id", authenticate, requirePermission(PERMISSIONS.PUBLICATION_DELETE), deletePublicationController);

export default router;
