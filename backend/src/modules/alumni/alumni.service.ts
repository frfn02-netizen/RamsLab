import { ObjectId } from "mongodb";
import {
  deleteAlumni as deleteAlumniRecord,
  getAlumniCollection,
  findAlumniById,
  findAlumniByNim,
  findAlumniByUserId,
  findAlumniList,
} from "./alumni.repository.js";
import { getUsersCollection } from "../users/user.repository.js";
import { USER_ROLES } from "../users/user.types.js";
import {
  createAlumniSchema,
  completeMyAlumniSchema,
  updateAlumniSchema,
  updateMyAlumniSchema,
  type CreateAlumniInput,
  type UpdateAlumniInput,
  type UpdateMyAlumniInput,
} from "./alumni.schema.js";
import { SECURITY_LIMITS } from "../../config/security.js";
import { ALUMNI_REVIEW_STATUS } from "./alumni.types.js";

export async function createAlumni(input: CreateAlumniInput) {
  const data = createAlumniSchema.parse(input);

  const users = getUsersCollection();

  const alumniCollection = getAlumniCollection();
  const userId = new ObjectId(data.userId);

  const existingUser = await users.findOne({
    _id: userId,
  });

  if (!existingUser) {
    throw new Error("User not found");
  }

  if (existingUser.role !== USER_ROLES.ALUMNI) {
    throw new Error("User must have ALUMNI role");
  }

  const existingAlumni = await findAlumniByUserId(userId);

  if (existingAlumni) {
    throw new Error("Alumni profile already exists");
  }

  const existingNim = await findAlumniByNim(data.nim);

  if (existingNim) {
    throw new Error("NIM already exists");
  }

  const now = new Date();

  const alumni = {
    userId,

    fullName: data.fullName,

    nim: data.nim,

    photo: data.photo,

    angkatan: data.angkatan,

    program: data.program,

    phone: data.phone,

    location: data.location,

    currentStatus: data.currentStatus,

    otherStatus: data.otherStatus,

    currentCompany: data.currentCompany,

    currentPosition: data.currentPosition,

    linkedin: data.linkedin,

    bio: data.bio,

    careerHistory: data.careerHistory,

    educationHistory: data.educationHistory,

    // Publication is an administrator decision, never a client-controlled
    // side effect of account creation.
    isPublic: false,
    reviewStatus: ALUMNI_REVIEW_STATUS.PENDING,
    profileCompleted: Boolean(
      data.fullName && data.nim && data.angkatan && data.photo,
    ),

    createdAt: now,

    updatedAt: now,
  };

  const result = await alumniCollection.insertOne(alumni);

  return {
    ...alumni,
    _id: result.insertedId,
  };
}

export async function createAlumniShell(userId: string) {
  if (!ObjectId.isValid(userId)) throw new Error("Invalid user ID");
  const alumniCollection = getAlumniCollection();
  const now = new Date();
  const alumni = {
    userId: new ObjectId(userId),
    fullName: "",
    angkatan: undefined,
    program: "",
    currentStatus: "OTHER" as const,
    careerHistory: [],
    educationHistory: [],
    isPublic: false,
    reviewStatus: ALUMNI_REVIEW_STATUS.PENDING,
    profileCompleted: false,
    createdAt: now,
    updatedAt: now,
  };
  const result = await alumniCollection.insertOne(alumni);
  return { ...alumni, _id: result.insertedId };
}

export async function getAlumniById(id: string) {
  const alumni = await findAlumniById(id);
  if (!alumni) return null;
  const user = alumni.userId
    ? await getUsersCollection().findOne({ _id: alumni.userId })
    : null;
  return {
    ...alumni,
    accountEmail: user?.email,
    accountActive: user?.isActive,
    mustChangePassword: user?.mustChangePassword ?? false,
  };
}

export async function deleteAlumni(id: string) {
  if (!ObjectId.isValid(id)) throw new Error("Invalid alumni ID");
  return deleteAlumniRecord(id);
}

export async function getAlumniByUserId(userId: string) {
  if (!ObjectId.isValid(userId)) {
    return null;
  }

  return findAlumniByUserId(new ObjectId(userId));
}

export async function updateAlumni(id: string, input: UpdateAlumniInput) {
  if (!ObjectId.isValid(id)) {
    throw new Error("Invalid alumni ID");
  }

  const data = updateAlumniSchema.parse(input);

  const alumniCollection = getAlumniCollection();
  const existing = await findAlumniById(id);

  const updateData = {
    ...data,
    // Any alumni-authored change must be reviewed again before it can be
    // returned from a public endpoint. `isPublic` remains the visibility
    // preference, but approval is the server-enforced publication gate.
    reviewStatus: ALUMNI_REVIEW_STATUS.PENDING,
    ...(data.fullName &&
    existing?.nim &&
    data.angkatan &&
    (data.photo !== undefined || existing?.photo)
      ? { profileCompleted: true }
      : {}),
    updatedAt: new Date(),
  };

  await alumniCollection.updateOne(
    {
      _id: new ObjectId(id),
    },
    {
      $set: updateData,
    },
  );

  return findAlumniById(id);
}

export async function reviewAlumni(id: string, approved: boolean) {
  if (!ObjectId.isValid(id)) return null;

  const reviewStatus = approved
    ? ALUMNI_REVIEW_STATUS.APPROVED
    : ALUMNI_REVIEW_STATUS.REJECTED;

  await getAlumniCollection().updateOne(
    { _id: new ObjectId(id) },
    {
      $set: {
        reviewStatus,
        // Approval is the explicit publication action. Rejection always
        // removes the record from public visibility.
        isPublic: approved,
        updatedAt: new Date(),
      },
    },
  );

  return findAlumniById(id);
}

export async function updateMyAlumni(
  userId: string,
  input: UpdateMyAlumniInput,
) {
  if (!ObjectId.isValid(userId)) {
    throw new Error("Invalid user ID");
  }

  const data = completeMyAlumniSchema.parse(input);

  const alumniCollection = getAlumniCollection();
  const existing = await findAlumniByUserId(new ObjectId(userId));

  const updateData = {
    ...data,
    ...((data.fullName || existing?.fullName) &&
    (data.nim || existing?.nim) &&
    (data.angkatan || existing?.angkatan) &&
    (data.photo || existing?.photo)
      ? { profileCompleted: true }
      : {}),
    updatedAt: new Date(),
  };

  await alumniCollection.updateOne(
    {
      userId: new ObjectId(userId),
    },
    {
      $set: updateData,
    },
  );

  return findAlumniByUserId(new ObjectId(userId));
}

export async function getAlumniList(
  page: number,
  limit: number,
  search?: string,
) {
  const safePage = Math.max(1, page);

  const safeLimit = Math.min(Math.max(1, limit), SECURITY_LIMITS.maxPageSize);

  const result = await findAlumniList({
    page: safePage,
    limit: safeLimit,
    search,
  });
  const users = await getUsersCollection()
    .find({ _id: { $in: result.data.map((item) => item.userId) } })
    .toArray();
  const byId = new Map(users.map((user) => [user._id!.toString(), user]));
  result.data = result.data.map((item) => {
    const user = byId.get(item.userId.toString());
    return {
      ...item,
      accountEmail: user?.email,
      accountActive: user?.isActive,
      mustChangePassword: user?.mustChangePassword ?? false,
    };
  });

  const totalPages = Math.ceil(result.total / safeLimit);

  return {
    data: result.data,
    total: result.total,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total: result.total,
      totalPages,
    },
  };
}
