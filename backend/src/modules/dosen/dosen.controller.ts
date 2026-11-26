import type { Request, Response } from "express";
import { ObjectId } from "mongodb";
import {
  createDosenSchema,
  dosenAccessSchema,
  updateDosenSchema,
} from "./dosen.schema.js";
import {
  createDosen,
  deleteDosen,
  findAllDosen,
  findDosenByEmployeeId,
  findDosenById,
  findDosenConflict,
  updateDosen,
} from "./dosen.repository.js";
import {
  deactivateUser,
  deleteUser,
  findUserById,
  setUserActive,
} from "../users/user.repository.js";
import { createDosenUser } from "../users/user.service.js";
import { getPublicationsCollection } from "../publications/publication.repository.js";
import { removeDosenPhoto, saveDosenPhoto } from "./dosen-photo.js";
import { toPublicDosenProfile } from "../public/public-profile.js";

const MAX_PHOTO_BYTES = 3 * 1024 * 1024;

export const INVALID_PUBLICATION_REFERENCE =
  "One or more publications do not exist";

// Validates Lecturer → Publication associations: every ID must reference an
// existing Publication. Duplicates are removed while preserving order.
// Returns undefined when the caller did not provide any associations.
async function resolvePublicationIds(
  ids: string[] | undefined,
): Promise<string[] | undefined> {
  if (ids === undefined) return undefined;
  const unique = [...new Set(ids.map((id) => new ObjectId(id).toHexString()))];
  if (unique.length === 0) return [];
  const found = await getPublicationsCollection()
    .find(
      { _id: { $in: unique.map((id) => new ObjectId(id)) } },
      { projection: { _id: 1 } },
    )
    .toArray();
  if (found.length !== unique.length) {
    throw new Error(INVALID_PUBLICATION_REFERENCE);
  }
  return unique;
}

// ========================================
// GET ALL DOSEN
// ========================================

export async function getDosenListController(_req: Request, res: Response) {
  try {
    const dosen = await findAllDosen();

    return res.json({
      success: true,
      // This is an authenticated internal directory. Keep the fields used by
      // the dashboard (such as employeeId) here; public responses use the
      // deliberately smaller serializer below.
      data: dosen,
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch dosen",
    });
  }
}

// ========================================
// GET PUBLIC DOSEN
// ========================================

export async function getPublicDosenController(req: Request, res: Response) {
  try {
    const dosen = await findAllDosen({
      publicOnly: true,
    });

    return res.json({
      success: true,
      data: dosen.map((member) => toPublicDosenProfile(req, member)),
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch public dosen",
    });
  }
}

// ========================================
// GET DOSEN BY ID
// ========================================

export async function getDosenController(req: Request, res: Response) {
  try {
    const id = req.params.id as string;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid dosen ID",
      });
    }

    const dosen = await findDosenById(id);

    if (!dosen) {
      return res.status(404).json({
        success: false,
        message: "Dosen not found",
      });
    }

    // Account status lives on the linked user document. Expose it for the
    // admin edit form without merging auth fields into the profile document.
    const account = await findUserById(dosen.userId.toString());

    return res.json({
      success: true,
      data: { ...dosen, accountActive: account?.isActive === true },
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch dosen",
    });
  }
}

export async function setDosenAccountActiveController(
  req: Request,
  res: Response,
) {
  try {
    const id = req.params.id as string;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid dosen ID",
      });
    }

    const parsed = dosenAccessSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
      });
    }

    const dosen = await findDosenById(id);
    if (!dosen) {
      return res.status(404).json({
        success: false,
        message: "Dosen not found",
      });
    }

    // Deactivation increments tokenVersion, revoking existing sessions, and
    // removes the account from Mailjet recipient queries. The profile and
    // historical meeting references stay intact.
    const updated = await setUserActive(dosen.userId, parsed.data.isActive);
    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "Linked account not found",
      });
    }

    return res.json({
      success: true,
      data: { isActive: parsed.data.isActive },
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Failed to update dosen account access",
    });
  }
}

export async function uploadDosenPhotoController(req: Request, res: Response) {
  try {
    const id = req.params.id as string;
    if (!ObjectId.isValid(id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid dosen ID" });
    }

    const dosen = await findDosenById(id);
    if (!dosen) {
      return res
        .status(404)
        .json({ success: false, message: "Dosen not found" });
    }

    const photo = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
    if (photo.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "Photo is required" });
    }
    if (photo.length > MAX_PHOTO_BYTES) {
      return res
        .status(413)
        .json({ success: false, message: "Photo must be 3 MB or smaller" });
    }

    const uploadedPhoto = await saveDosenPhoto(photo);
    const updated = await updateDosen(id, {
      photo: uploadedPhoto.url,
    });
    if (!updated) {
      await removeDosenPhoto(uploadedPhoto.url);
      return res
        .status(404)
        .json({ success: false, message: "Dosen not found" });
    }

    await removeDosenPhoto(dosen.photo);
    return res.json({ success: true, data: updated });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "Unsupported image format"
    ) {
      return res.status(415).json({
        success: false,
        message: "Only JPG, PNG, and WebP photos are supported",
      });
    }
    return res
      .status(500)
      .json({ success: false, message: "Failed to upload dosen photo" });
  }
}

// ========================================
// GET DOSEN BY EMPLOYEE ID
// ========================================

export async function getDosenByEmployeeIdController(
  req: Request,
  res: Response,
) {
  try {
    const employeeId = req.params.employeeId as string;
    const dosen = await findDosenByEmployeeId(employeeId);

    if (!dosen) {
      return res.status(404).json({
        success: false,
        message: "Dosen not found",
      });
    }

    return res.json({
      success: true,
      data: dosen,
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch dosen",
    });
  }
}

// ========================================
// CREATE DOSEN
// ========================================

export async function createDosenController(req: Request, res: Response) {
  // Set when this request provisioned the auth account itself. Any later
  // failure rolls it back so no orphaned login exists.
  let rollbackUserId: ObjectId | null = null;

  try {
    const input = createDosenSchema.parse(req.body);
    let temporaryPassword: string | undefined;
    let profileUserId = input.userId;

    if (input.userId) {
      const user = await findUserById(input.userId);
      if (!user || !user.isActive || user.role !== "DOSEN") {
        return res.status(400).json({
          success: false,
          message: "userId must reference an active DOSEN account",
        });
      }
    } else {
      const email = input.email!;

      // Detect profile conflicts before creating the auth account. The
      // employeeId unique index still guards against races.
      const conflict = await findDosenConflict({
        employeeId: input.employeeId,
        nip: input.nip,
        nidn: input.nidn,
      });
      if (conflict) {
        return res.status(409).json({
          success: false,
          message: `A dosen with this ${conflict} already exists`,
          code: "DOSEN_DUPLICATE",
        });
      }

      const account = await createDosenUser({
        email,
        password: input.password,
      });
      rollbackUserId = new ObjectId(account.id);
      profileUserId = account.id;
      temporaryPassword = account.temporaryPassword;
    }

    const { password: _password, userId: _userId, ...profileInput } = input;
    const dosen = await createDosen({
      ...profileInput,
      userId: profileUserId!,
      publicationIds: (await resolvePublicationIds(input.publicationIds)) ?? [],
    });

    // The one-time temporary password is returned to the admin UI. No email is
    // sent here; Mailjet is reserved for H-24h meeting reminders.
    return res.status(201).json({
      success: true,
      data: dosen,
      ...(temporaryPassword ? { temporaryPassword } : {}),
    });
  } catch (error: any) {
    if (rollbackUserId) {
      try {
        await deleteUser(rollbackUserId);
      } catch (rollbackError) {
        console.error("Failed to roll back provisioned dosen account", {
          error:
            rollbackError instanceof Error
              ? rollbackError.message
              : "unknown error",
        });
      }
    }

    if (error?.name === "ZodError") {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: error.issues,
      });
    }

    if (error?.message === INVALID_PUBLICATION_REFERENCE) {
      return res.status(400).json({
        success: false,
        message: INVALID_PUBLICATION_REFERENCE,
      });
    }

    if (
      error?.code === 11000 ||
      (error instanceof Error && error.message === "Email is already registered")
    ) {
      return res.status(409).json({
        success: false,
        message: "Dosen with this email, userId, or employeeId already exists",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to create dosen",
    });
  }
}

// ========================================
// UPDATE DOSEN
// ========================================

export async function updateDosenController(req: Request, res: Response) {
  try {
    const id = req.params.id as string;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid dosen ID",
      });
    }

    const input = updateDosenSchema.parse(req.body);

    const dosen = await updateDosen(id, {
      ...input,
      publicationIds: await resolvePublicationIds(input.publicationIds),
    });

    if (!dosen) {
      return res.status(404).json({
        success: false,
        message: "Dosen not found",
      });
    }

    return res.json({
      success: true,
      data: dosen,
    });
  } catch (error: any) {
    if (error?.name === "ZodError") {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: error.issues,
      });
    }

    if (error?.message === INVALID_PUBLICATION_REFERENCE) {
      return res.status(400).json({
        success: false,
        message: INVALID_PUBLICATION_REFERENCE,
      });
    }

    if (error?.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Dosen with this employeeId already exists",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to update dosen",
    });
  }
}

// ========================================
// DELETE DOSEN
// ========================================

export async function deleteDosenController(req: Request, res: Response) {
  try {
    const id = req.params.id as string;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid dosen ID",
      });
    }

    const existing = await findDosenById(id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Dosen not found",
      });
    }

    if (!(await deactivateUser(existing.userId))) {
      return res.status(500).json({
        success: false,
        message: "Failed to deactivate dosen account",
      });
    }

    const deleted = await deleteDosen(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Dosen not found",
      });
    }

    // Photo cleanup is best-effort. The database record has already been
    // deleted; a missing/unavailable Cloudinary configuration must not turn a
    // successful delete into a misleading 500 response.
    try {
      await removeDosenPhoto(existing.photo);
    } catch (error) {
      console.error("Failed to remove deleted dosen photo", error);
    }

    return res.json({
      success: true,
      message: "Dosen deleted successfully",
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Failed to delete dosen",
    });
  }
}
