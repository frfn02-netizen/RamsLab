import { getStudentCollection } from "./student.repository.js";

export async function createStudentIndexes() {
  const collection = getStudentCollection();
  await collection.createIndex(
    { studentType: 1, isPublic: 1 },
    { name: "students_public_type_index" },
  );
  await collection.createIndex(
    { fullName: 1 },
    { name: "students_name_index" },
  );
  await collection.createIndex(
    { nim: 1 },
    { unique: true, sparse: true, name: "students_nim_unique" },
  );
  console.log("Student indexes created");
}
