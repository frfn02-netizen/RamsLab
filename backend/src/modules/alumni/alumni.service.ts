import { ObjectId } from "mongodb";
import { getAlumniCollection, findAlumniById, findAlumniByNim, findAlumniByUserId, findAlumniList} from "./alumni.repository.js";
import { getUsersCollection, } from "../users/user.repository.js";
import { USER_ROLES, } from "../users/user.types.js";
import {
  createAlumniSchema,
  updateAlumniSchema,
  updateMyAlumniSchema,
  type CreateAlumniInput,
  type UpdateAlumniInput,
  type UpdateMyAlumniInput,
} from "./alumni.schema.js";
import { SECURITY_LIMITS } from "../../config/security.js";

export async function createAlumni(
  input: CreateAlumniInput
) {
  const data =
    createAlumniSchema.parse(input);

  const users =
    getUsersCollection();

  const alumniCollection =
    getAlumniCollection();

  const userId =
    new ObjectId(data.userId);

  const existingUser =
    await users.findOne({
      _id: userId,
    });

  if (!existingUser) {
    throw new Error(
      "User not found"
    );
  }

  if (
    existingUser.role !==
    USER_ROLES.ALUMNI
  ) {
    throw new Error(
      "User must have ALUMNI role"
    );
  }

  const existingAlumni =
    await findAlumniByUserId(userId);

  if (existingAlumni) {
    throw new Error(
      "Alumni profile already exists"
    );
  }

  const existingNim =
    await findAlumniByNim(data.nim);

  if (existingNim) {
    throw new Error(
      "NIM already exists"
    );
  }

  const now = new Date();

  const alumni = {
    userId,

    fullName: data.fullName,

    nim: data.nim,

    photo: data.photo,

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

    bio: data.bio,

    careerHistory:
      data.careerHistory,

    educationHistory:
      data.educationHistory,

    isPublic:
      data.isPublic,

    createdAt: now,

    updatedAt: now,
  };

  const result =
    await alumniCollection.insertOne(
      alumni
    );

  return {
    ...alumni,
    _id: result.insertedId,
  };
}

export async function getAlumniById(
  id: string
) {
  return findAlumniById(id);
}

export async function getAlumniByUserId(
  userId: string
) {
  if (!ObjectId.isValid(userId)) {
    return null;
  }

  return findAlumniByUserId(
    new ObjectId(userId)
  );
}

export async function updateAlumni(
  id: string,
  input: UpdateAlumniInput
) {
  if (!ObjectId.isValid(id)) {
    throw new Error(
      "Invalid alumni ID"
    );
  }

  const data =
    updateAlumniSchema.parse(input);

  const alumniCollection =
    getAlumniCollection();

  const updateData = {
    ...data,
    updatedAt: new Date(),
  };

  await alumniCollection.updateOne(
    {
      _id: new ObjectId(id),
    },
    {
      $set: updateData,
    }
  );

  return findAlumniById(id);
}

export async function updateMyAlumni(
  userId: string,
  input: UpdateMyAlumniInput
) {
  if (!ObjectId.isValid(userId)) {
    throw new Error("Invalid user ID");
  }

  const data =
    updateMyAlumniSchema.parse(input);

  const alumniCollection =
    getAlumniCollection();

  const updateData = {
    ...data,
    updatedAt: new Date(),
  };

  await alumniCollection.updateOne(
    {
      userId: new ObjectId(userId),
    },
    {
      $set: updateData,
    }
  );

  return findAlumniByUserId(
    new ObjectId(userId)
  );
}

export async function getAlumniList(
  page: number,
  limit: number,
  search?: string
) {
  const safePage =
    Math.max(1, page);

  const safeLimit = Math.min(Math.max(1, limit), SECURITY_LIMITS.maxPageSize);

  const result =
    await findAlumniList({
      page: safePage,
      limit: safeLimit,
      search,
    });

  const totalPages =
    Math.ceil(
      result.total / safeLimit
    );

  return {
    data: result.data,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total: result.total,
      totalPages,
    },
  };
}
