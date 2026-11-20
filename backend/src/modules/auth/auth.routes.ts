import { Router } from "express";
import {
  csrfController,
  changePasswordController,
  forgotPasswordController,
  loginController,
  logoutController,
  registerController,
  resetPasswordController,
} from "./auth.controller.js";
import { createRateLimiter } from "../../middlewares/rate-limit.middleware.js";
import { SECURITY_LIMITS } from "../../config/security.js";
import { authenticate } from "../../middlewares/auth.middlewares.js";

const router = Router();

router.use((_req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});

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
router.post(
  "/register",
  createRateLimiter({
    windowMs: SECURITY_LIMITS.loginWindowMs,
    max: SECURITY_LIMITS.maxLoginAttemptsPerIp,
    message: "Too many registration attempts from this address",
  }),
  registerController,
);
router.post(
  "/forgot-password",
  createRateLimiter({
    windowMs: SECURITY_LIMITS.passwordResetWindowMs,
    max: SECURITY_LIMITS.maxPasswordResetRequestsPerIp,
    message: "Too many password reset requests from this address",
  }),
  createRateLimiter({
    windowMs: SECURITY_LIMITS.passwordResetWindowMs,
    max: SECURITY_LIMITS.maxPasswordResetRequestsPerEmail,
    message: "Too many password reset requests",
    keyGenerator: (req) =>
      `${req.ip ?? "unknown"}:${typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "unknown"}`,
  }),
  forgotPasswordController,
);
router.post(
  "/reset-password",
  createRateLimiter({
    windowMs: SECURITY_LIMITS.passwordResetWindowMs,
    max: SECURITY_LIMITS.maxPasswordResetSubmissionsPerIp,
    message: "Too many password reset attempts from this address",
  }),
  resetPasswordController,
);
router.post("/change-password", authenticate, changePasswordController);
router.post("/logout", logoutController);

export default router;
