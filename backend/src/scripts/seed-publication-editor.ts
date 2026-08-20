import "dotenv/config";
import bcrypt from "bcrypt";
import { connectDatabase } from "../config/database.js";
import { getUsersCollection } from "../modules/users/user.repository.js";
import { USER_ROLES } from "../modules/users/user.types.js";

async function seedPublicationEditor() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("The development Publication Editor seed is disabled in production");
  }

  const email = process.env.SEED_PUBLICATION_EDITOR_EMAIL?.trim().toLowerCase();
  const password = process.env.SEED_PUBLICATION_EDITOR_PASSWORD;
  if (!email || !password || password.length < 12) {
    throw new Error("SEED_PUBLICATION_EDITOR_EMAIL and a 12+ character SEED_PUBLICATION_EDITOR_PASSWORD are required");
  }

  await connectDatabase();
  const users = getUsersCollection();
  const existing = await users.findOne({ email });
  if (existing) {
    console.log("⚠️ Development Publication Editor already exists");
    return;
  }

  const now = new Date();
  await users.insertOne({
    email,
    passwordHash: await bcrypt.hash(password, 12),
    role: USER_ROLES.PUBLICATION_EDITOR,
    isActive: true,
    tokenVersion: 0,
    lastLoginAt: null,
    createdAt: now,
    updatedAt: now,
  });

  console.log("✅ Development-only Publication Editor created");
}

seedPublicationEditor().catch((error) => {
  console.error("❌ Failed to seed Publication Editor:", error);
  process.exit(1);
});
