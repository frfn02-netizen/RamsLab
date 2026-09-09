import { v2 as cloudinary, type UploadApiResponse } from "cloudinary";
import { randomUUID } from "node:crypto";
import { Readable } from "node:stream";

const CLOUDINARY_FOLDER = "rams-platform/profile-photos";
const SITE_CONTENT_HOMEPAGE_FOLDER = "rams-platform/site-content/homepage";
const RESEARCH_AREA_FOLDER = "rams-platform/research-areas";
const PUBLICATION_FOLDER = "rams-platform/publications";
const RESEARCH_HIGHLIGHT_FOLDER = "rams-platform/research-highlights";
const EVENT_FOLDER = "rams-platform/events";
const PROJECT_FOLDER = "rams-platform/projects";
const PARTNER_LOGO_FOLDER = "rams-platform/partner-logos";
const PUBLIC_SERVICE_FOLDER = "rams-platform/public-services";

function ensureCloudinaryConfigured() {
  if (!process.env.CLOUDINARY_URL) {
    throw new Error("CLOUDINARY_URL is not configured");
  }

  cloudinary.config({ secure: true });
}

function uploadBuffer(
  buffer: Buffer,
  folder: string,
  resourceType: "image" | "raw" = "image",
  originalFilename?: string,
): Promise<UploadApiResponse> {
  ensureCloudinaryConfigured();

  return new Promise((resolve, reject) => {
    const upload = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: resourceType,
        overwrite: false,
        ...(originalFilename
          ? {
              public_id: `${safePdfBaseName(originalFilename)}-${randomUUID()}`,
            }
          : {}),
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }
        if (!result) {
          reject(new Error("Cloudinary returned no upload result"));
          return;
        }
        resolve(result);
      },
    );

    Readable.from([buffer]).pipe(upload);
  });
}

export async function uploadProfilePhoto(buffer: Buffer) {
  const result = await uploadBuffer(buffer, CLOUDINARY_FOLDER);
  return {
    url: result.secure_url,
    publicId: result.public_id,
  };
}

export async function uploadSiteContentHomepageImage(buffer: Buffer) {
  const result = await uploadBuffer(buffer, SITE_CONTENT_HOMEPAGE_FOLDER);
  return {
    url: result.secure_url,
    publicId: result.public_id,
  };
}

export async function uploadResearchAreaPng(buffer: Buffer) {
  const result = await uploadBuffer(buffer, RESEARCH_AREA_FOLDER);
  return {
    url: result.secure_url,
    publicId: result.public_id,
  };
}

export async function uploadResearchHighlightImage(buffer: Buffer) {
  const result = await uploadBuffer(buffer, RESEARCH_HIGHLIGHT_FOLDER);
  return {
    url: result.secure_url,
    publicId: result.public_id,
  };
}

export async function uploadEventImage(buffer: Buffer) {
  const result = await uploadBuffer(buffer, EVENT_FOLDER);
  return {
    url: result.secure_url,
    publicId: result.public_id,
  };
}

export async function uploadProjectImage(buffer: Buffer) {
  const result = await uploadBuffer(buffer, PROJECT_FOLDER);
  return {
    url: result.secure_url,
    publicId: result.public_id,
  };
}

export async function uploadPartnerLogo(buffer: Buffer) {
  const result = await uploadBuffer(buffer, PARTNER_LOGO_FOLDER);
  return {
    url: result.secure_url,
    publicId: result.public_id,
  };
}

function safePdfBaseName(filename: string) {
  const base = filename.replace(/\.pdf$/i, "").trim();
  const sanitized = base
    .replace(/[\\/\u0000-\u001f\u007f]/g, "")
    .replace(/[^\p{L}\p{N}._() -]/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 160);
  return sanitized || "publication";
}

export function normalizePdfFilename(filename: string) {
  const base = safePdfBaseName(filename);
  return `${base}.pdf`;
}

export async function uploadPublicationPdf(
  buffer: Buffer,
  originalFilename = "publication.pdf",
) {
  const filename = normalizePdfFilename(originalFilename);
  const result = await uploadBuffer(
    buffer,
    PUBLICATION_FOLDER,
    "raw",
    filename,
  );
  return {
    url: result.secure_url,
    publicId: result.public_id,
    filename,
  };
}

function publicIdFromPhotoUrl(photo: string) {
  try {
    const pathname = new URL(photo).pathname;
    const segments = pathname.split("/").filter(Boolean);
    const uploadIndex = segments.indexOf("upload");
    if (uploadIndex < 0) return undefined;

    let publicIdSegments = segments.slice(uploadIndex + 1);
    if (publicIdSegments[0]?.startsWith("v")) {
      publicIdSegments = publicIdSegments.slice(1);
    }
    if (publicIdSegments.length === 0) return undefined;

    const last = publicIdSegments.length - 1;
    publicIdSegments[last] = publicIdSegments[last].replace(
      /\.(jpg|jpeg|png|webp|gif|avif)$/i,
      "",
    );
    return publicIdSegments.join("/");
  } catch {
    return undefined;
  }
}

export async function removeProfilePhoto(photo?: string) {
  if (!photo || !photo.includes("res.cloudinary.com/")) return;

  const publicId = publicIdFromPhotoUrl(photo);
  if (!publicId) return;

  ensureCloudinaryConfigured();
  await cloudinary.uploader.destroy(publicId, { resource_type: "image" });
}

function rawPublicIdFromUrl(fileUrl: string) {
  try {
    const pathname = new URL(fileUrl).pathname;
    const segments = pathname.split("/").filter(Boolean);
    const uploadIndex = segments.indexOf("upload");
    if (uploadIndex < 0) return undefined;

    let publicIdSegments = segments.slice(uploadIndex + 1);
    if (publicIdSegments[0]?.startsWith("v")) {
      publicIdSegments = publicIdSegments.slice(1);
    }
    return publicIdSegments.length > 0 ? publicIdSegments.join("/") : undefined;
  } catch {
    return undefined;
  }
}

export async function removePublicationPdf(fileUrl?: string) {
  if (!fileUrl || !fileUrl.includes("res.cloudinary.com/")) return;

  const publicId = rawPublicIdFromUrl(fileUrl);
  if (!publicId) return;

  ensureCloudinaryConfigured();
  await cloudinary.uploader.destroy(publicId, {
    resource_type: "raw",
    type: "upload",
    invalidate: true,
  });
}

export async function removeResearchHighlightImage(publicId?: string) {
  if (!publicId) return;

  ensureCloudinaryConfigured();
  await cloudinary.uploader.destroy(publicId, {
    resource_type: "image",
    type: "upload",
    invalidate: true,
  });
}

export async function uploadPublicServiceImage(buffer: Buffer) {
  const result = await uploadBuffer(buffer, PUBLIC_SERVICE_FOLDER);
  return {
    url: result.secure_url,
    publicId: result.public_id,
  };
}

export async function removeEventImage(publicId?: string) {
  if (!publicId) return;

  ensureCloudinaryConfigured();
  await cloudinary.uploader.destroy(publicId, {
    resource_type: "image",
    type: "upload",
    invalidate: true,
  });
}
