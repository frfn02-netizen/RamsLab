import bcrypt from "bcrypt";
import { ObjectId } from "mongodb";

import {
  getUsersCollection,
  findUserByEmail,
} from "../users/user.repository.js";

import { USER_ROLES } from "../users/user.types.js";

import {
  createAlumni,
} from "./alumni.service.js";

import {
  createAdminAlumniSchema,
  type CreateAdminAlumniInput,
} from "./admin-alumni.schema.js";

export async function createAdminAlumni(
  input: CreateAdminAlumniInput
) {
  const data =
    createAdminAlumniSchema.parse(input);

  const users =
    getUsersCollection();

  // Check email
  const existingUser =
    await findUserByEmail(data.email);

  if (existingUser) {
    throw new Error("Email already exists");
  }

  // Hash password
  const passwordHash =
    await bcrypt.hash(data.password, 12);

  const now = new Date();

  // Create user
  const user = {
    email: data.email.toLowerCase(),
    passwordHash,
    role: USER_ROLES.ALUMNI,
    isActive: true,
    lastLoginAt: null,
    createdAt: now,
    updatedAt: now,
  };

  const userResult =
    await users.insertOne(user);

  const userId =
    userResult.insertedId;

  try {
    // Create alumni profile
    const alumni =
      await createAlumni({
        userId: userId.toString(),

        fullName: data.fullName,
        nim: data.nim,
        graduationYear:
          data.graduationYear,
        program: data.program,

        phone: data.phone,
        location: data.location,

        currentStatus:
          data.currentStatus,

        currentCompany:
          data.currentCompany,

        currentPosition:
          data.currentPosition,

        linkedin:
          data.linkedin,

        bio:
          data.bio,

        careerHistory: [],
        educationHistory: [],

        isPublic:
          data.isPublic,
      });

    return {
      user: {
        id: userId.toString(),
        email: user.email,
        role: user.role,
        isActive: user.isActive,
      },

      alumni,
    };
  } catch (error) {
    // Rollback user if alumni creation fails
    await users.deleteOne({
      _id: userId,
    });

    throw error;
  }
}