import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middlewares.js";
import { requireRole } from "../../middlewares/role.middlewares.js";
import {
  createResearchAreaController,
  deleteResearchAreaController,
  getResearchAreaController,
  getResearchAreaListController,
  updateResearchAreaController,
} from "./research.controller.js";

const router = Router();
router.use(authenticate, requireRole("ADMIN"));
router.get("/", getResearchAreaListController);
router.get("/:id", getResearchAreaController);
router.post("/", createResearchAreaController);
router.patch("/:id", updateResearchAreaController);
router.delete("/:id", deleteResearchAreaController);

export default router;
