import express, { Router } from "express";
import {
  authenticate,
  optionallyAuthenticate,
} from "../../middlewares/auth.middlewares.js";
import { requireRole } from "../../middlewares/role.middlewares.js";
import {
  PERMISSIONS,
  requirePermission,
} from "../../middlewares/permission.middlewares.js";
import {
  createPublicationController,
  deletePublicationController,
  getPublicationController,
  getPublicationListController,
  getPublicPublicationPdfController,
  updatePublicationController,
  uploadTemporaryPublicationPdfController,
  uploadPublicationPdfController,
} from "./publication.controller.js";

const router = Router();

router.get("/", optionallyAuthenticate, getPublicationListController);
router.get("/:id/pdf", getPublicPublicationPdfController);
router.get("/:id", optionallyAuthenticate, getPublicationController);

router.post(
  "/pdf-upload",
  authenticate,
  requireRole("ADMIN"),
  express.raw({ type: "*/*", limit: "30mb" }),
  uploadTemporaryPublicationPdfController,
);

router.post(
  "/",
  authenticate,
  requirePermission(PERMISSIONS.PUBLICATION_CREATE),
  createPublicationController,
);
router.patch(
  "/:id",
  authenticate,
  requirePermission(PERMISSIONS.PUBLICATION_UPDATE),
  updatePublicationController,
);
router.post(
  "/:id/pdf",
  authenticate,
  requireRole("ADMIN"),
  express.raw({ type: "*/*", limit: "30mb" }),
  uploadPublicationPdfController,
);
router.delete(
  "/:id",
  authenticate,
  requirePermission(PERMISSIONS.PUBLICATION_DELETE),
  deletePublicationController,
);

export default router;
