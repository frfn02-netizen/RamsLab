import type { Request, Response } from "express";
import { ObjectId } from "mongodb";
import { createStudentSchema, updateStudentSchema } from "./student.schema.js";
import {
  createStudent,
  deleteStudent,
  findAllStudents,
  findStudentById,
  updateStudent,
} from "./student.repository.js";
import {
  removeStudentPhoto,
  saveStudentPhoto,
} from "./student-photo.js";
import type { Student } from "./student.types.js";

function serializeStudent(student: Student) {
  return { ...student, _id: student._id?.toString() };
}

export async function getStudentListController(_req: Request, res: Response) {
  try {
    const students = await findAllStudents();
    return res.json({ success: true, data: students.map(serializeStudent) });
  } catch {
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch students" });
  }
}

export async function getStudentController(req: Request, res: Response) {
  const id = req.params.id as string;
  if (!ObjectId.isValid(id))
    return res
      .status(400)
      .json({ success: false, message: "Invalid student ID" });
  try {
    const student = await findStudentById(id);
    if (!student)
      return res
        .status(404)
        .json({ success: false, message: "Student not found" });
    return res.json({ success: true, data: serializeStudent(student) });
  } catch {
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch student" });
  }
}

export async function createStudentController(req: Request, res: Response) {
  try {
    const input = createStudentSchema.parse(req.body);
    const student = await createStudent(input);
    return res
      .status(201)
      .json({ success: true, data: serializeStudent(student) });
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "ZodError") {
      return res
        .status(400)
        .json({
          success: false,
          message: "Validation failed",
          errors: (error as { issues?: unknown }).issues,
        });
    }
    return res
      .status(500)
      .json({ success: false, message: "Failed to create student" });
  }
}

export async function updateStudentController(req: Request, res: Response) {
  const id = req.params.id as string;
  if (!ObjectId.isValid(id))
    return res
      .status(400)
      .json({ success: false, message: "Invalid student ID" });
  try {
    const input = updateStudentSchema.parse(req.body);
    const student = await updateStudent(id, input);
    if (!student)
      return res
        .status(404)
        .json({ success: false, message: "Student not found" });
    return res.json({ success: true, data: serializeStudent(student) });
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "ZodError") {
      return res
        .status(400)
        .json({
          success: false,
          message: "Validation failed",
          errors: (error as { issues?: unknown }).issues,
        });
    }
    return res
      .status(500)
      .json({ success: false, message: "Failed to update student" });
  }
}

export async function uploadStudentPhotoController(
  req: Request,
  res: Response,
) {
  try {
    const id = req.params.id as string;
    if (!ObjectId.isValid(id))
      return res
        .status(400)
        .json({ success: false, message: "Invalid student ID" });

    const student = await findStudentById(id);
    if (!student)
      return res
        .status(404)
        .json({ success: false, message: "Student not found" });

    const photo = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
    if (photo.length === 0)
      return res
        .status(400)
        .json({ success: false, message: "Photo is required" });
    if (photo.length > 3 * 1024 * 1024)
      return res
        .status(413)
        .json({ success: false, message: "Photo must be 3 MB or smaller" });

    const uploadedPhoto = await saveStudentPhoto(photo);
    const updated = await updateStudent(id, {
      photo: uploadedPhoto.url,
    });
    if (!updated) {
      await removeStudentPhoto(uploadedPhoto.url);
      return res
        .status(404)
        .json({ success: false, message: "Student not found" });
    }

    await removeStudentPhoto(student.photo);
    return res.json({ success: true, data: serializeStudent(updated) });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "Unsupported image format"
    ) {
      return res
        .status(415)
        .json({
          success: false,
          message: "Only JPG, PNG, and WebP photos are supported",
        });
    }
    return res
      .status(500)
      .json({ success: false, message: "Failed to upload student photo" });
  }
}

export async function deleteStudentController(req: Request, res: Response) {
  const id = req.params.id as string;
  if (!ObjectId.isValid(id))
    return res
      .status(400)
      .json({ success: false, message: "Invalid student ID" });
  try {
    const student = await findStudentById(id);
    if (!student || !(await deleteStudent(id)))
      return res
        .status(404)
        .json({ success: false, message: "Student not found" });
    await removeStudentPhoto(student.photo);
    return res.json({ success: true, message: "Student deleted successfully" });
  } catch {
    return res
      .status(500)
      .json({ success: false, message: "Failed to delete student" });
  }
}
