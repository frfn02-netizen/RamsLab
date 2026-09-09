import { Router, raw } from "express";
import { authenticate } from "../../middlewares/auth.middlewares.js";
import { requireRole } from "../../middlewares/role.middlewares.js";
import {
  createPublicServiceController,
  createPublicServiceExpertController,
  deletePublicServiceController,
  deletePublicServiceExpertController,
  getPublicServiceController,
  getPublicServiceExpertController,
  getPublicServiceExpertListController,
  getPublicServiceListController,
  updatePublicServiceController,
  updatePublicServiceExpertController,
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

export default router;
