import type { Request, Response } from "express";
import { MongoServerError, ObjectId } from "mongodb";
import { ZodError } from "zod";
import { findAlumniById } from "../alumni/alumni.repository.js";
import { findDosenById } from "../dosen/dosen.repository.js";
import { findStudentById } from "../students/student.repository.js";
import {
  toPublicAlumniProfile,
  toPublicDosenProfile,
  toPublicStudentProfile,
} from "../public/public-profile.js";
import {
  createPublicServiceExpertSchema,
  createPublicServiceSchema,
  updatePublicServiceExpertSchema,
  updatePublicServiceSchema,
} from "./public-service.schema.js";
import {
  createPublicService,
  createPublicServiceExpert,
  deletePublicService,
  deletePublicServiceExpert,
  findAllPublicServiceExperts,
  findAllPublicServices,
  findPublicServiceById,
  findPublicServiceExpertById,
  updatePublicService,
  updatePublicServiceExpert,
} from "./public-service.repository.js";
import type {
  PublicService,
  PublicServiceExpert,
} from "./public-service.types.js";
import { uploadPublicServiceImage } from "../../lib/cloudinary.js";

const MAX_PUBLIC_SERVICE_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_EXTENSIONS = /\.(jpg|jpeg|png|webp|gif)$/i;

function validationError(error: unknown): error is ZodError {
  return error instanceof ZodError;
}

function duplicateError(error: unknown): boolean {
  return error instanceof MongoServerError && error.code === 11000;
}

function adminExpert(expert: PublicServiceExpert) {
  return {
    ...expert,
    _id: expert._id?.toString(),
    peopleRef: expert.peopleRef
      ? { kind: expert.peopleRef.kind, id: expert.peopleRef.id.toString() }
      : undefined,
    updatedBy: expert.updatedBy?.toString(),
  };
}

function adminService(service: PublicService) {
  return {
    ...service,
    _id: service._id?.toString(),
    updatedBy: service.updatedBy?.toString(),
  };
}

async function publicExpert(req: Request, expert: PublicServiceExpert) {
  let person = null;
  if (expert.peopleRef?.kind === "DOSEN") {
    const member = await findDosenById(expert.peopleRef.id.toString());
    person = member?.isPublic ? toPublicDosenProfile(req, member) : null;
  }
  if (expert.peopleRef?.kind === "STUDENT") {
    const member = await findStudentById(expert.peopleRef.id.toString());
    person = member?.isPublic ? toPublicStudentProfile(req, member) : null;
  }
  if (expert.peopleRef?.kind === "ALUMNI") {
    const member = await findAlumniById(expert.peopleRef.id.toString());
    person = member?.isPublic ? toPublicAlumniProfile(req, member) : null;
  }
  if (!person) return null;
  return {
    id: expert._id?.toString() ?? "",
    peopleId: person.id,
    expertise: expert.expertise,
    order: expert.order,
    person,
  };
}

function resolveDescription(service: PublicService) {
  return (
    service.description ??
    service.shortDescription ??
    service.detailedDescription
  );
}

function publicService(service: PublicService, detail = false) {
  return {
    id: service._id?.toString() ?? "",
    code: service.code,
    title: service.title,
    description: resolveDescription(service),
    images: service.images ?? [],
    order: service.order,
    ...(detail
      ? {
          companies: service.companies
            .filter((company) => company.published)
            .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name)),
          jobs: service.jobs
            .filter((job) => job.published)
            .sort(
              (a, b) => a.order - b.order || a.name.en.localeCompare(b.name.en),
            ),
        }
      : {}),
  };
}

export async function getPublicServiceExpertListController(
  _req: Request,
  res: Response,
) {
  try {
    return res.json({
      success: true,
      data: (await findAllPublicServiceExperts()).map(adminExpert),
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch public service experts",
    });
  }
}

export async function getPublicServiceExpertController(
  req: Request,
  res: Response,
) {
  const id = req.params.id as string;
  if (!ObjectId.isValid(id)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid expert ID" });
  }
  try {
    const expert = await findPublicServiceExpertById(id);
    if (!expert) {
      return res
        .status(404)
        .json({ success: false, message: "Expert not found" });
    }
    return res.json({ success: true, data: adminExpert(expert) });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch public service expert",
    });
  }
}

export async function createPublicServiceExpertController(
  req: Request,
  res: Response,
) {
  try {
    const expert = await createPublicServiceExpert(
      createPublicServiceExpertSchema.parse(req.body),
      req.user?.userId,
    );
    return res.status(201).json({ success: true, data: adminExpert(expert) });
  } catch (error: unknown) {
    if (validationError(error)) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: error.issues,
      });
    }
    return res.status(500).json({
      success: false,
      message: "Failed to create public service expert",
    });
  }
}

export async function updatePublicServiceExpertController(
  req: Request,
  res: Response,
) {
  const id = req.params.id as string;
  if (!ObjectId.isValid(id)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid expert ID" });
  }
  try {
    const expert = await updatePublicServiceExpert(
      id,
      updatePublicServiceExpertSchema.parse(req.body),
      req.user?.userId,
    );
    if (!expert) {
      return res
        .status(404)
        .json({ success: false, message: "Expert not found" });
    }
    return res.json({ success: true, data: adminExpert(expert) });
  } catch (error: unknown) {
    if (validationError(error)) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: error.issues,
      });
    }
    return res.status(500).json({
      success: false,
      message: "Failed to update public service expert",
    });
  }
}

export async function deletePublicServiceExpertController(
  req: Request,
  res: Response,
) {
  const id = req.params.id as string;
  if (!ObjectId.isValid(id)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid expert ID" });
  }
  try {
    if (!(await deletePublicServiceExpert(id))) {
      return res
        .status(404)
        .json({ success: false, message: "Expert not found" });
    }
    return res.json({ success: true, message: "Expert removed successfully" });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Failed to remove public service expert",
    });
  }
}

export async function getPublicServiceListController(
  _req: Request,
  res: Response,
) {
  try {
    return res.json({
      success: true,
      data: (await findAllPublicServices()).map(adminService),
    });
  } catch {
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch public services" });
  }
}

export async function getPublicServiceController(req: Request, res: Response) {
  const id = req.params.id as string;
  if (!ObjectId.isValid(id)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid service ID" });
  }
  try {
    const service = await findPublicServiceById(id);
    if (!service) {
      return res
        .status(404)
        .json({ success: false, message: "Service not found" });
    }
    return res.json({ success: true, data: adminService(service) });
  } catch {
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch public service" });
  }
}

export async function createPublicServiceController(
  req: Request,
  res: Response,
) {
  try {
    const service = await createPublicService(
      createPublicServiceSchema.parse(req.body),
      req.user?.userId,
    );
    return res.status(201).json({ success: true, data: adminService(service) });
  } catch (error: unknown) {
    if (validationError(error)) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: error.issues,
      });
    }
    if (duplicateError(error)) {
      return res.status(409).json({
        success: false,
        message: "Public service code already exists",
      });
    }
    return res
      .status(500)
      .json({ success: false, message: "Failed to create public service" });
  }
}

export async function updatePublicServiceController(
  req: Request,
  res: Response,
) {
  const id = req.params.id as string;
  if (!ObjectId.isValid(id)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid service ID" });
  }
  try {
    const service = await updatePublicService(
      id,
      updatePublicServiceSchema.parse(req.body),
      req.user?.userId,
    );
    if (!service) {
      return res
        .status(404)
        .json({ success: false, message: "Service not found" });
    }
    return res.json({ success: true, data: adminService(service) });
  } catch (error: unknown) {
    if (validationError(error)) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: error.issues,
      });
    }
    if (duplicateError(error)) {
      return res.status(409).json({
        success: false,
        message: "Public service code already exists",
      });
    }
    return res
      .status(500)
      .json({ success: false, message: "Failed to update public service" });
  }
}

export async function deletePublicServiceController(
  req: Request,
  res: Response,
) {
  const id = req.params.id as string;
  if (!ObjectId.isValid(id)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid service ID" });
  }
  try {
    if (!(await deletePublicService(id))) {
      return res
        .status(404)
        .json({ success: false, message: "Service not found" });
    }
    return res.json({ success: true, message: "Service deleted successfully" });
  } catch {
    return res
      .status(500)
      .json({ success: false, message: "Failed to delete public service" });
  }
}

export async function uploadPublicServiceImageController(
  req: Request,
  res: Response,
) {
  const image = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
  const contentType = req.headers["content-type"] ?? "";
  const filename =
    typeof req.query.filename === "string" ? req.query.filename : "";
  const id = req.params.id as string;
  if (!ObjectId.isValid(id)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid service ID" });
  }
  if (!contentType.startsWith("image/")) {
    return res
      .status(400)
      .json({ success: false, message: "Image file required" });
  }
  if (filename && !ALLOWED_IMAGE_EXTENSIONS.test(filename)) {
    return res.status(400).json({
      success: false,
      message: "Only JPG, PNG, WebP, and GIF files are supported",
    });
  }
  if (!image.length || image.length > MAX_PUBLIC_SERVICE_IMAGE_BYTES) {
    return res
      .status(400)
      .json({ success: false, message: "Image must be 5 MB or smaller" });
  }
  try {
    if (!(await findPublicServiceById(id))) {
      return res
        .status(404)
        .json({ success: false, message: "Service not found" });
    }
    const uploaded = await uploadPublicServiceImage(image);
    return res.json({ success: true, data: uploaded });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Failed to upload public service image",
    });
  }
}

export async function getPublicPublicServiceListController(
  req: Request,
  res: Response,
) {
  try {
    const [experts, services] = await Promise.all([
      findAllPublicServiceExperts({ publishedOnly: true }),
      findAllPublicServices({ publishedOnly: true }),
    ]);
    return res.json({
      success: true,
      data: {
        experts: (
          await Promise.all(experts.map((expert) => publicExpert(req, expert)))
        ).filter((expert) => expert !== null),
        services: services.map((service) => publicService(service)),
      },
    });
  } catch {
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch public service page" });
  }
}

export async function getPublicPublicServiceDetailController(
  _req: Request,
  res: Response,
) {
  const id = _req.params.id as string;
  if (!ObjectId.isValid(id)) {
    return res
      .status(404)
      .json({ success: false, message: "Service not found" });
  }
  try {
    const service = await findPublicServiceById(id);
    if (!service?.published) {
      return res
        .status(404)
        .json({ success: false, message: "Service not found" });
    }
    return res.json({ success: true, data: publicService(service, true) });
  } catch {
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch public service" });
  }
}
