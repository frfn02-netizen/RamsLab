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

    const email =
      "dosen.testing@rams.test";

    const password =
      "DosenTest123!";

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
      lastLoginAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    console.log(
      "✅ Dosen user created"
    );

    console.log(
      `📧 Email: ${email}`
    );

    console.log(
      `🔑 Password: ${password}`
    );

  } catch (error) {
    console.error(
      "❌ Failed to seed dosen:",
      error
    );

    process.exit(1);
  }
}


seedDosen();