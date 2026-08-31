import { v2 as cloudinary, type UploadApiResponse } from "cloudinary";
import { Readable } from "node:stream";

const CLOUDINARY_FOLDER = "rams-platform/profile-photos";

function ensureCloudinaryConfigured() {
  if (!process.env.CLOUDINARY_URL) {
    throw new Error("CLOUDINARY_URL is not configured");
  }

  cloudinary.config({ secure: true });
}

function uploadBuffer(
  buffer: Buffer,
  folder: string,
): Promise<UploadApiResponse> {
  ensureCloudinaryConfigured();

  return new Promise((resolve, reject) => {
    const upload = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "image",
        overwrite: false,
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
