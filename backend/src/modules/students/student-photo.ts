import { uploadProfilePhoto, removeProfilePhoto } from "../../lib/cloudinary.js";

export async function saveStudentPhoto(buffer: Buffer) {
  return uploadProfilePhoto(buffer);
}

export { removeProfilePhoto as removeStudentPhoto };
