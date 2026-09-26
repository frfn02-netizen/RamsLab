import { ObjectId } from "mongodb";
import {
  deleteAlumni as deleteAlumniRecord,
  getAlumniCollection,
  findAlumniById,
  findAlumniByUserId,
  findAlumniList,
} from "./alumni.repository.js";
import { getUsersCollection } from "../users/user.repository.js";
import {
  completeMyAlumniSchema,
  updateAlumniSchema,
  updateMyAlumniSchema,
  type UpdateAlumniInput,
  type UpdateMyAlumniInput,
} from "./alumni.schema.js";
import { SECURITY_LIMITS } from "../../config/security.js";
import { HttpError } from "../../middlewares/error.middleware.js";
import { ALUMNI_REVIEW_STATUS, type Alumni } from "./alumni.types.js";
import { isProfileComplete } from "./alumni-completeness.js";

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
    // Any change to an alumni record has to be reviewed again before it can
    // be returned from a public endpoint. `isPublic` remains the visibility
    // preference, but approval is the server-enforced publication gate.
    reviewStatus: ALUMNI_REVIEW_STATUS.PENDING,
    // Recompute from the merged document so an admin edit can never leave a
    // stale "complete" flag behind.
    profileCompleted: isProfileComplete({ ...existing, ...data }),
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

export async function reviewAlumni(
  id: string,
  approved: boolean,
  reason?: string,
) {
  if (!ObjectId.isValid(id)) return null;

  const existing = await findAlumniById(id);
  if (!existing) return null;

  const reviewNote = typeof reason === "string" ? reason.trim() : "";

  // A rejection must always tell the alumni what to fix, so the service —
  // not only the controller — refuses an empty or whitespace-only reason.
  if (!approved && !reviewNote) {
    throw new HttpError(400, "Rejection reason is required.");
  }

  // Approval is never blocked by profile completeness (product decision by
  // Pak Dhimas): an incomplete profile may be approved and published, and
  // `profileCompleted` stays a recomputed informational flag. `reviewStatus`
  // + `isPublic` remain the only publication state.
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
        // Approving clears the note so a past rejection is never reported as
        // an active one against a published profile.
        reviewNote: approved ? null : reviewNote,
        updatedAt: new Date(),
      },
    },
  );

  return findAlumniById(id);
}

// Academic identity may be claimed once by the alumni (a registration shell
// holds no NIM / batch / program yet) and is immutable afterwards: only an
// administrator can correct it afterwards.
const ACADEMIC_IDENTITY_FIELDS = ["nim", "angkatan", "program"] as const;

// Fields that represent alumni-authored profile content. `isPublic` is a
// visibility preference, not content, so toggling it never re-queues a
// profile for review.
const PROFILE_CONTENT_FIELDS = [
  "fullName",
  "nim",
  "program",
  "angkatan",
  "photo",
  "phone",
  "location",
  "currentStatus",
  "otherStatus",
  "currentCompany",
  "currentPosition",
  "linkedin",
  "bio",
  "careerHistory",
  "educationHistory",
] as const;

type AcademicIdentity = Partial<
  Pick<Alumni, (typeof ACADEMIC_IDENTITY_FIELDS)[number]>
>;

function comparable(value: unknown) {
  return value === undefined || value === null ? "" : value;
}

function stripAcademicOverwrites<T extends AcademicIdentity>(
  data: T,
  existing: AcademicIdentity | null,
): T {
  const safeData = { ...data };
  for (const field of ACADEMIC_IDENTITY_FIELDS) {
    if (safeData[field] !== undefined && comparable(existing?.[field]) !== "") {
      delete safeData[field];
    }
  }
  return safeData;
}

function hasProfileChanges(
  data: Record<string, unknown>,
  existing: object | null,
): boolean {
  const stored = existing as Record<string, unknown> | null;
  return PROFILE_CONTENT_FIELDS.some((field) => {
    if (data[field] === undefined) return false;
    return (
      JSON.stringify(comparable(data[field])) !==
      JSON.stringify(comparable(stored?.[field]))
    );
  });
}

// `graduationYear` was renamed to `angkatan` (batch number instead of calendar
// year) and the old payloads are silently stripped by zod, which made a save
// look successful while nothing was written. Fail loudly instead.
function rejectRenamedLegacyField(input: unknown) {
  if (input && typeof input === "object" && "graduationYear" in input) {
    throw new HttpError(
      400,
      "graduationYear no longer exists; use angkatan (batch number between 1 and 99). Reload the page to load the latest form.",
      { field: "graduationYear" },
    );
  }
}

export async function updateMyAlumni(
  userId: string,
  input: UpdateMyAlumniInput,
) {
  if (!ObjectId.isValid(userId)) {
    throw new Error("Invalid user ID");
  }

  rejectRenamedLegacyField(input);

  const data = completeMyAlumniSchema.parse(input);

  const alumniCollection = getAlumniCollection();
  const existing = await findAlumniByUserId(new ObjectId(userId));

  const safeData = stripAcademicOverwrites(data, existing);
  const contentChanged = hasProfileChanges(safeData, existing);
  const previousStatus = existing?.reviewStatus;

  // Saving a profile that was rejected, already approved, or (for records
  // created before reviewStatus existed) never reviewed puts it back in the
  // review queue, so edited data is never published without a new approval.
  const requeue = contentChanged || previousStatus === undefined;

  const updateData = {
    ...safeData,
    profileCompleted: isProfileComplete({ ...existing, ...safeData }),
    ...(requeue
      ? {
          reviewStatus: ALUMNI_REVIEW_STATUS.PENDING,
          ...(previousStatus === ALUMNI_REVIEW_STATUS.APPROVED ||
          previousStatus === ALUMNI_REVIEW_STATUS.REJECTED
            ? { isPublic: false }
            : {}),
          // The note described the previous review round. Once the alumni
          // resubmits, it is no longer an active rejection and must not be
          // shown as one.
          reviewNote: null,
        }
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
