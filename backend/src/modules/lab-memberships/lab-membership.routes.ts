import { Router } from "express";

import { authenticate } from "../../middlewares/auth.middlewares.js";
import { requireRole } from "../../middlewares/role.middlewares.js";
import {
  addLabMembershipController,
  deactivateLabMembershipController,
  listLabMembershipsController,
  searchLabMembershipCandidatesController,
  updateLabMembershipController,
} from "./lab-membership.controller.js";

const router = Router();

router.use(authenticate);
router.use(requireRole("ADMIN"));

router.get("/", listLabMembershipsController);
router.get("/candidates", searchLabMembershipCandidatesController);
router.post("/", addLabMembershipController);
router.patch("/:userId", updateLabMembershipController);
router.delete("/:userId", deactivateLabMembershipController);

export default router;
