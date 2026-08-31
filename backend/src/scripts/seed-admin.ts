import bcrypt from "bcrypt";
import dotenv from "dotenv";
import { getUsersCollection } from "../modules/users/user.repository.js";
import { connectDatabase } from "../config/database.js";
import { USER_ROLES } from "../modules/users/user.types.js";

dotenv.config();

async function seedAdmin() {
  try {
    await connectDatabase();

    const users = getUsersCollection();

    const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
    const password = process.env.SEED_ADMIN_PASSWORD;
    if (!email || !password || password.length < 12) {
      throw new Error(
        "SEED_ADMIN_EMAIL and a 12+ character SEED_ADMIN_PASSWORD are required",
      );
    }

    const existingAdmin = await users.findOne({
      email,
    });

    if (existingAdmin) {
      console.log("⚠️ Admin already exists");
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await users.insertOne({
      email,
      passwordHash,
      role: USER_ROLES.ADMIN,
      isActive: true,
      tokenVersion: 0,
      lastLoginAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    console.log("✅ Admin created");
    console.log("Admin account created");
  } catch (error) {
    console.error("❌ Failed to seed admin:", error);

    process.exit(1);
  }
}

seedAdmin();
