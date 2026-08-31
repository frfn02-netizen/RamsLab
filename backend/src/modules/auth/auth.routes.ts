import { Router } from "express";
import {
  csrfController,
  loginController,
  logoutController,
} from "./auth.controller.js";
import { createRateLimiter } from "../../middlewares/rate-limit.middleware.js";
import { SECURITY_LIMITS } from "../../config/security.js";
import { authenticate } from "../../middlewares/auth.middlewares.js";

const router = Router();

router.get("/csrf", authenticate, csrfController);

router.post(
  "/login",
  createRateLimiter({
    windowMs: SECURITY_LIMITS.loginWindowMs,
    max: SECURITY_LIMITS.maxLoginAttemptsPerIp,
    message: "Too many login attempts from this address",
  }),
  createRateLimiter({
    windowMs: SECURITY_LIMITS.loginWindowMs,
    max: SECURITY_LIMITS.maxLoginAttempts,
    message: "Too many login attempts",
    keyGenerator: (req) =>
      `${req.ip ?? "unknown"}:${typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "unknown"}`,
  }),
  loginController,
);
router.post("/logout", logoutController);

export default router;
