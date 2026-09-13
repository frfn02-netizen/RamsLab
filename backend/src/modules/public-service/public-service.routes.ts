import { Router, raw } from "express";
import { authenticate } from "../../middlewares/auth.middlewares.js";
import { requireRole } from "../../middlewares/role.middlewares.js";
import {
  createPublicServiceController,
  createPublicServiceExpertController,
  createPublicServiceProjectController,
  deletePublicServiceController,
  deletePublicServiceExpertController,
  deletePublicServiceProjectController,
  getPublicServiceController,
  getPublicServiceExpertController,
  getPublicServiceExpertListController,
  getPublicServiceListController,
  getPublicServiceProjectController,
  getPublicServiceProjectListController,
  updatePublicServiceController,
  updatePublicServiceExpertController,
  updatePublicServiceProjectController,
  uploadPublicServiceImageController,
} from "./public-service.controller.js";

const router = Router();
router.use(authenticate, requireRole("ADMIN"));
router.get("/experts", getPublicServiceExpertListController);
router.get("/experts/:id", getPublicServiceExpertController);
router.post("/experts", createPublicServiceExpertController);
router.patch("/experts/:id", updatePublicServiceExpertController);
router.delete("/experts/:id", deletePublicServiceExpertController);
router.get("/services", getPublicServiceListController);
router.get("/services/:id", getPublicServiceController);
router.post("/services", createPublicServiceController);
router.patch("/services/:id", updatePublicServiceController);
router.post(
  "/services/:id/image",
  raw({ type: "image/*", limit: "5mb" }),
  uploadPublicServiceImageController,
);
router.delete("/services/:id", deletePublicServiceController);
router.get("/projects", getPublicServiceProjectListController);
router.get("/projects/:id", getPublicServiceProjectController);
router.post("/projects", createPublicServiceProjectController);
router.patch("/projects/:id", updatePublicServiceProjectController);
router.delete("/projects/:id", deletePublicServiceProjectController);

export default router;
