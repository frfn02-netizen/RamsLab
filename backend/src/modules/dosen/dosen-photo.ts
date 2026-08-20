import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import type { Request } from "express";
import { getPublicApiOrigin } from "../public/public-profile.js";

const PHOTO_DIRECTORY = path.resolve(process.cwd(), "uploads", "dosen");

export function getDosenPhotoDirectory() {
  return PHOTO_DIRECTORY;
}

function extensionForPhoto(buffer: Buffer) {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "jpg";
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "png";
  if (buffer.length >= 12 && buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP") return "webp";
  return null;
}

export async function saveDosenPhoto(buffer: Buffer) {
  const extension = extensionForPhoto(buffer);
  if (!extension) throw new Error("Unsupported image format");

  await fs.mkdir(PHOTO_DIRECTORY, { recursive: true });
  const filename = `${crypto.randomUUID()}.${extension}`;
  const temporaryPath = path.join(PHOTO_DIRECTORY, `.${filename}.tmp`);
  const finalPath = path.join(PHOTO_DIRECTORY, filename);
  await fs.writeFile(temporaryPath, buffer, { flag: "wx" });
  await fs.rename(temporaryPath, finalPath);
  return filename;
}

export async function removeDosenPhoto(photo?: string) {
  if (!photo) return;
  let filename: string;
  try {
    filename = path.basename(new URL(photo, "http://localhost").pathname);
  } catch {
    return;
  }
  if (!/^[a-f0-9-]+\.(jpg|png|webp)$/i.test(filename)) return;
  await fs.unlink(path.join(PHOTO_DIRECTORY, filename)).catch(() => undefined);
}

export function getDosenPhotoUrl(req: Request, filename: string) {
  return `${getPublicApiOrigin(req)}/uploads/dosen/${filename}`;
}
