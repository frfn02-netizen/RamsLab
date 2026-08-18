import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import authRoutes from "./modules/auth/auth.routes.js";
import alumniRoutes from "./modules/alumni/alumni.routes.js";
import userRoutes from "./modules/users/user.routes.js";
import trackingRoutes from "./modules/tracking/tracking.routes.js";
import dosenRoutes from "./modules/dosen/dosen.routes.js";
import projectRoutes from "./modules/projects/project.routes.js";
import partnerRoutes from "./modules/partners/partner.routes.js";
import dashboardRoutes from "./modules/dashboard/dashboard.routes.js";
import publicRoutes from "./modules/public/public.routes.js";
import researchRoutes from "./modules/research/research.routes.js";
import siteContentRoutes from "./modules/site-content/site-content.routes.js";
import { authenticate } from "./middlewares/auth.middlewares.js";
import { requireRole } from "./middlewares/role.middlewares.js";
import { getAllowedOrigins, isProduction, SECURITY_LIMITS, validateProductionSecurityConfiguration } from "./config/security.js";
import { createRateLimiter } from "./middlewares/rate-limit.middleware.js";
import { verifyStateChangingOrigin } from "./middlewares/request-security.middleware.js";
import { errorHandler, notFoundHandler } from "./middlewares/error.middleware.js";

const app = express();

validateProductionSecurityConfiguration();

app.disable("x-powered-by");
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'none'"],
        frameAncestors: ["'none'"],
        baseUri: ["'none'"],
      },
    },
    hsts: isProduction()
      ? { maxAge: 31536000, includeSubDomains: true, preload: true }
      : false,
    referrerPolicy: { policy: "no-referrer" },
    crossOriginResourcePolicy: { policy: "same-site" },
  })
);

const allowedOrigins = getAllowedOrigins();
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    credentials: true,
    methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "X-CSRF-Token"],
  })
);

app.use(express.json({ limit: SECURITY_LIMITS.jsonBodyBytes }));
app.use(cookieParser());
app.use(verifyStateChangingOrigin);
app.use(
  "/api",
  createRateLimiter({
    windowMs: SECURITY_LIMITS.apiWindowMs,
    max: SECURITY_LIMITS.maxApiRequests,
    message: "Too many API requests",
  })
);
app.use("/api/auth", authRoutes);
app.use("/api/alumni", alumniRoutes);
app.use("/api/users", userRoutes);
app.use("/api/tracking", trackingRoutes);
app.use("/api/dosen", dosenRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/partners", partnerRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/public", publicRoutes);
app.use("/api/admin/research", researchRoutes);
app.use("/api/admin/site-content", siteContentRoutes);

app.get(
"/api/admin/test",
  authenticate,
  requireRole("ADMIN"),
  (_req, res) => {
    return res.json({
      success: true,
      message: "Admin access granted",
    });
  }
);

app.get(
  "/api/auth/me",
  authenticate,
  (req, res) => {
    return res.json({
      success: true,
      user: req.user
        ? { userId: req.user.userId, role: req.user.role }
        : undefined,
    });
  }
);

app.get(
  "/api/health",
  (_req, res) => {
    return res.json({
      success: true,
      message: "RAMS API is running",
      timestamp: new Date().toISOString(),
    });
  }
);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
