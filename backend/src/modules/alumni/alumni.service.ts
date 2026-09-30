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
import {
  ALUMNI_REVIEW_STATUS,
  type Alumni,
  type AlumniReviewStatus,
} from "./alumni.types.js";
import { isProfileComplete } from "./alumni-completeness.js";
import { isApprovedAlumniProgram } from "./alumni-program.js";

export async function createAlumniShell(
  userId: string,
  fullName?: string,
  tahunAngkatan?: number,
) {
  if (!ObjectId.isValid(userId)) throw new Error("Invalid user ID");
  const alumniCollection = getAlumniCollection();
  const now = new Date();
  const alumni = {
    userId: new ObjectId(userId),
    // The registration year and its derived P are kept on the shell from the
    // moment the account is created. Optional arguments retain compatibility
    // with existing direct callers such as scripts and tests.
    fullName: fullName?.trim() || "",
    tahunAngkatan: tahunAngkatan ?? undefined,
    angkatan:
      typeof tahunAngkatan === "number"
        ? deriveAngkatanFromTahunAngkatan(tahunAngkatan)
        : undefined,
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

  const alumniCollection = getAlumniCollection();
  const existing = await findAlumniById(id);

  const parsed = updateAlumniSchema.parse(input);
  assertCohortYear(parsed.tahunAngkatan, existing?.tahunAngkatan);
  const data = withDerivedAngkatan(stripManualBatchNumber(parsed, existing), existing);

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
// administrator can correct it afterwards. A pre-approved-list program is an
// exception: it stays intact until the alumni chooses an approved replacement,
// which then becomes the one-time claim.
const ACADEMIC_IDENTITY_FIELDS = ["nim", "angkatan", "program"] as const;

// Fields that represent alumni-authored profile content. `isPublic` is a
// visibility preference, not content, so toggling it never re-queues a
// profile for review.
const PROFILE_CONTENT_FIELDS = [
  "fullName",
  "nim",
  "program",
  "angkatan",
  "tahunAngkatan",
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
    const existingValue = existing?.[field];
    const legacyProgramIsReplaceable =
      field === "program" &&
      comparable(existingValue) !== "" &&
      !isApprovedAlumniProgram(existingValue);

    if (
      safeData[field] !== undefined &&
      comparable(existingValue) !== "" &&
      !legacyProgramIsReplaceable
    ) {
      delete safeData[field];
    }
  }
  return safeData;
}

// Pak Dhimas defines P as the cohort year minus 1960. `angkatan` remains the
// persisted compatibility field used by existing API consumers, but users do
// not enter it directly in either profile form. A supplied cohort year is the
// authoritative value and may therefore update a previously stored P.
//
// P stays a two-digit batch number, so only this window can derive one. The
// acceptance window on the schemas is the historical 1900..2100 (see
// alumni.schema.ts) so a legacy record can always re-save its own value; only
// a *new* value has to land here (see `assertCohortYear`).
const DERIVABLE_MIN_YEAR = 1961;
const DERIVABLE_MAX_YEAR = 2059;

export function deriveAngkatanFromTahunAngkatan(
  tahunAngkatan: number,
): number | undefined {
  if (
    !Number.isInteger(tahunAngkatan) ||
    tahunAngkatan < DERIVABLE_MIN_YEAR ||
    tahunAngkatan > DERIVABLE_MAX_YEAR
  ) {
    return undefined;
  }
  return tahunAngkatan - 1960;
}

// A cohort year outside the derivable window is tolerated only when it merely
// echoes what is already stored. That keeps every legacy record savable —
// including a field the user touched without intending to change it — while
// genuinely new values are still held to the range that keeps P valid.
function assertCohortYear(
  next: number | null | undefined,
  stored: number | null | undefined,
) {
  if (typeof next !== "number") return;
  if (next === stored) return;
  if (
    next < DERIVABLE_MIN_YEAR ||
    next > DERIVABLE_MAX_YEAR ||
    !Number.isInteger(next)
  ) {
    throw new HttpError(
      400,
      `Tahun Angkatan must be between ${DERIVABLE_MIN_YEAR} and ${DERIVABLE_MAX_YEAR}.`,
      { field: "tahunAngkatan" },
    );
  }
}

type CohortInput = {
  angkatan?: number;
  tahunAngkatan?: number | null;
};

type CohortRecord = {
  angkatan?: number | null;
  tahunAngkatan?: number | null;
};

// `angkatan` is derived, never authored, so a manually supplied batch number
// is only meaningful while the record has no cohort year to derive it from
// (the one-time claim for legacy P-only records). Whenever a year exists — in
// the payload or on the stored record — the payload's `angkatan` is dropped
// before the derived value is written, so the two can never diverge.
function stripManualBatchNumber<T extends CohortInput>(
  data: T,
  existing: CohortRecord | null,
): T {
  const resultingYear =
    data.tahunAngkatan !== undefined
      ? data.tahunAngkatan
      : (existing?.tahunAngkatan ?? undefined);

  if (typeof resultingYear !== "number") return data;

  const safeData = { ...data };
  delete safeData.angkatan;
  return safeData;
}

function withDerivedAngkatan<T extends CohortInput>(
  data: T,
  existing: CohortRecord | null,
): T & { angkatan?: number } {
  if (typeof data.tahunAngkatan !== "number") return data;

  // P is written only when the cohort year is established or actually changed.
  // Re-sending the stored value is an echo, not a change: records saved before
  // `P = tahunAngkatan - 1960` (e.g. tahunAngkatan 2002 / angkatan 89) must
  // stay exactly as stored and are never migrated or silently repaired here.
  if (data.tahunAngkatan === (existing?.tahunAngkatan ?? undefined)) return data;

  const derived = deriveAngkatanFromTahunAngkatan(data.tahunAngkatan);
  // A legacy out-of-range year has no valid P: leave `angkatan` alone so the
  // stored batch number survives the save instead of being nulled out.
  if (derived === undefined) return data;

  return { ...data, angkatan: derived };
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

// `graduationYear` was replaced by `tahunAngkatan`; the old payload is
// silently stripped by zod, which would otherwise make a save look successful
// while nothing was written. Fail loudly instead.
function rejectRenamedLegacyField(input: unknown) {
  if (input && typeof input === "object" && "graduationYear" in input) {
    throw new HttpError(
      400,
      "graduationYear no longer exists; use tahunAngkatan. Reload the page to load the latest form.",
      { field: "graduationYear" },
    );
  }
}

// The persisted compatibility field remains P (`angkatan`), but new accounts
// obtain it exclusively from Tahun Angkatan. Existing P-only records continue
// to satisfy this gate unchanged; no data migration is required.
const REGISTRATION_REQUIRED_FIELDS = ["fullName", "photo", "angkatan"] as const;

const REGISTRATION_FIELD_LABELS: Record<
  (typeof REGISTRATION_REQUIRED_FIELDS)[number],
  string
> = {
  fullName: "full name",
  photo: "photo",
  angkatan: "Tahun Angkatan",
};

function isRegistrationFieldPresent(value: unknown): boolean {
  if (typeof value === "string") return value.trim().length > 0;
  return value !== undefined && value !== null;
}

// `merged` is the document as it would be stored after this save, so the check
// sees both the already-persisted fields and the ones the payload changes.
// An omitted field counts as "keep whatever is stored" (undefined), while an
// explicitly emptied field counts as missing.
function assertRegistrationComplete(merged: object | null | undefined) {
  const stored = (merged ?? {}) as Record<string, unknown>;
  const missing = REGISTRATION_REQUIRED_FIELDS.filter(
    (field) => !isRegistrationFieldPresent(stored[field]),
  );

  if (missing.length === 0) return;

  const labels = missing.map((field) => REGISTRATION_FIELD_LABELS[field]);
  throw new HttpError(
    400,
    `Cannot save profile: ${labels.join(", ")} ${
      missing.length === 1 ? "is" : "are"
    } required to complete your alumni registration.`,
    { missing },
  );
}

export type UpdateMyAlumniOptions = {
  // The photo upload endpoint stores one of the mandatory registration fields
  // through this same save pipeline, so it cannot be blocked by the gate that
  // exists precisely to require that field. The profile-completion save keeps
  // the gate, which is what makes the registration impossible to finish
  // without full name + photo + angkatan.
  skipRegistrationCheck?: boolean;
};

export async function updateMyAlumni(
  userId: string,
  input: UpdateMyAlumniInput,
  options: UpdateMyAlumniOptions = {},
) {
  if (!ObjectId.isValid(userId)) {
    throw new Error("Invalid user ID");
  }

  rejectRenamedLegacyField(input);

  const alumniCollection = getAlumniCollection();
  const existing = await findAlumniByUserId(new ObjectId(userId));

  const parsed = completeMyAlumniSchema.parse(input);
  assertCohortYear(parsed.tahunAngkatan, existing?.tahunAngkatan);
  const data = withDerivedAngkatan(stripManualBatchNumber(parsed, existing), existing);

  const safeData = stripAcademicOverwrites(data, existing);
  // `stripAcademicOverwrites` protects manually supplied academic fields.
  // The derived P is different: it is controlled by Tahun Angkatan, so it
  // must replace a legacy P when the year actually changes. `withDerivedAngkatan`
  // only sets `angkatan` when the year is new or changed *and* yields a valid
  // P, so a manual claim, a legacy out-of-range year, or a re-sent unchanged
  // year can never reach this override.
  if (typeof data.tahunAngkatan === "number" && data.angkatan !== undefined) {
    safeData.angkatan = data.angkatan;
  }

  // The self save is the registration submission: refuse to persist it while
  // the resulting record would still be missing a mandatory registration
  // field, so partial data is never stored as if it were a valid registration.
  if (existing && !options.skipRegistrationCheck) {
    assertRegistrationComplete({ ...existing, ...safeData });
  }

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
  reviewStatus?: AlumniReviewStatus,
) {
  const safePage = Math.max(1, page);

  const safeLimit = Math.min(Math.max(1, limit), SECURITY_LIMITS.maxPageSize);

  const result = await findAlumniList({
    page: safePage,
    limit: safeLimit,
    search,
    reviewStatus,
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
