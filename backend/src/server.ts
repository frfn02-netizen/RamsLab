import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./modules/auth/auth.routes.js";
import cookieParser from "cookie-parser";
import { createPartnerIndexes } from "./modules/partners/partner.index.js";
import { createProjectIndexes } from "./modules/projects/project.index.js";
import { createDosenIndexes } from "./modules/dosen/dosen.index.js";
import { createUserIndexes } from "./modules/users/user.index.js";
import { createAlumniIndexes } from "./modules/alumni/alumni.index.js";
import { connectDatabase } from "./config/database.js";
import { authenticate} from "./middlewares/auth.middlewares.js";
import { requireRole } from "./middlewares/role.middlewares.js";
import alumniRoutes from "./modules/alumni/alumni.routes.js";
import userRoutes from "./modules/users/user.routes.js";
import trackingRoutes from "./modules/tracking/tracking.routes.js";

dotenv.config();

const app = express();

const PORT = process.env.PORT || 5000;

app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());
app.use("/api/auth", authRoutes);
app.use("/api/alumni", alumniRoutes);
app.use("/api/users", userRoutes);
app.use("/api/tracking", trackingRoutes);

app.get("/api/admin/test", authenticate, requireRole("ADMIN"),
(_req, res) => {
    return res.json({
        success: true,
        message: "Admin access granted",
    })
})

app.get("/api/auth/me", authenticate, (req, res) => {
  res.json({
    success: true,
    user: req.user,
  });
});

app.get("/api/health", (_req, res) => {
  res.json({
    success: true,
    message: "RAMS API is running",
    timestamp: new Date().toISOString(),
  });
});

async function startServer() {
  try {
    await connectDatabase();
    await createUserIndexes();
    await createAlumniIndexes();
    await createDosenIndexes();
    await createProjectIndexes();
    await createPartnerIndexes();

    app.listen(PORT, () => {
      console.log(`🚀 RAMS API running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
}

startServer();