import { Collection, ObjectId } from "mongodb";
import { getDatabase } from "../../config/database.js";
import { SECURITY_LIMITS } from "../../config/security.js";
import type {
  CreateStudentInput,
  UpdateStudentInput,
} from "./student.schema.js";
import type { Student, StudentType } from "./student.types.js";

const STUDENT_COLLECTION = "students";

export function getStudentCollection(): Collection<Student> {
  return getDatabase().collection<Student>(STUDENT_COLLECTION);
}

export async function findStudentById(id: string): Promise<Student | null> {
  if (!ObjectId.isValid(id)) return null;
  return getStudentCollection().findOne({ _id: new ObjectId(id) });
}

export async function findAllStudents(
  options: { publicOnly?: boolean; studentType?: StudentType } = {},
): Promise<Student[]> {
  const filter: Record<string, unknown> = {};
  if (options.publicOnly) filter.isPublic = true;
  if (options.studentType) filter.studentType = options.studentType;
  return getStudentCollection()
    .find(filter)
    .sort({ fullName: 1 })
    .limit(SECURITY_LIMITS.maxListResults)
    .toArray();
}

export async function createStudent(
  input: CreateStudentInput,
): Promise<Student> {
  const now = new Date();
  const student: Student = {
    ...input,
    internshipStartDate: input.internshipStartDate
      ? new Date(input.internshipStartDate)
      : undefined,
    internshipEndDate: input.internshipEndDate
      ? new Date(input.internshipEndDate)
      : undefined,
    createdAt: now,
    updatedAt: now,
  };
  const result = await getStudentCollection().insertOne(student);
  return { ...student, _id: result.insertedId };
}

export async function updateStudent(
  id: string,
  input: UpdateStudentInput,
): Promise<Student | null> {
  if (!ObjectId.isValid(id)) return null;
  const updateData: Record<string, unknown> = { ...input, updatedAt: new Date() };
  if (input.internshipStartDate !== undefined) {
    updateData.internshipStartDate = input.internshipStartDate
      ? new Date(input.internshipStartDate)
      : null;
  }
  if (input.internshipEndDate !== undefined) {
    updateData.internshipEndDate = input.internshipEndDate
      ? new Date(input.internshipEndDate)
      : null;
  }
  const result = await getStudentCollection().findOneAndUpdate(
    { _id: new ObjectId(id) },
    { $set: updateData },
    { returnDocument: "after" },
  );
  return result;
}

export async function deleteStudent(id: string): Promise<boolean> {
  if (!ObjectId.isValid(id)) return false;
  const result = await getStudentCollection().deleteOne({
    _id: new ObjectId(id),
  });
  return result.deletedCount === 1;
}
