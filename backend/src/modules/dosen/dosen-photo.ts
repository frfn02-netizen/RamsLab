import { uploadProfilePhoto, removeProfilePhoto } from "../../lib/cloudinary.js";

export async function saveDosenPhoto(buffer: Buffer) {
  return uploadProfilePhoto(buffer);
}

export { removeProfilePhoto as removeDosenPhoto };
