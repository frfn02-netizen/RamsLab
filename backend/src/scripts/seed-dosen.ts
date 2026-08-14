import bcrypt from "bcrypt";
import dotenv from "dotenv";

import {
  getUsersCollection,
} from "../modules/users/user.repository.js";

import {
  connectDatabase,
} from "../config/database.js";

import {
  USER_ROLES,
} from "../modules/users/user.types.js";


dotenv.config();


async function seedDosen() {
  try {
    await connectDatabase();

    const users =
      getUsersCollection();

    const email = process.env.SEED_DOSEN_EMAIL?.trim().toLowerCase();
    const password = process.env.SEED_DOSEN_PASSWORD;
    if (!email || !password || password.length < 12) {
      throw new Error("SEED_DOSEN_EMAIL and a 12+ character SEED_DOSEN_PASSWORD are required");
    }

    const existingDosen =
      await users.findOne({
        email,
      });

    if (existingDosen) {
      console.log(
        "⚠ Dosen already exists"
      );
      return;
    }

    const passwordHash =
      await bcrypt.hash(
        password,
        12
      );

    await users.insertOne({
      email,
      passwordHash,
      role: USER_ROLES.DOSEN,
      isActive: true,
      tokenVersion: 0,
      lastLoginAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    console.log(
      "✅ Dosen user created"
    );

    console.log("Dosen account created");

  } catch (error) {
    console.error(
      "❌ Failed to seed dosen:",
      error
    );

    process.exit(1);
  }
}


seedDosen();
