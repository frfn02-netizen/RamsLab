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

    const email = "admin@rams-its.id";
    const password = "masukkanpasswordyangvalid";

    const existingAdmin = await users.findOne({
      email,
    });

    if (existingAdmin) {
      console.log("⚠️ Admin already exists");
      return;
    }

    const passwordHash = await bcrypt.hash(
      password,
      12
    );

    await users.insertOne({
      email,
      passwordHash,
      role: USER_ROLES.ADMIN,
      isActive: true,
      lastLoginAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    console.log("✅ Admin created");
    console.log(`📧 Email: ${email}`);
    console.log(`🔑 Password: ${password}`);
  } catch (error) {
    console.error(
      "❌ Failed to seed admin:",
      error
    );

    process.exit(1);
  }
}

seedAdmin();