import { getStudentCollection } from "./student.repository.js";

export async function createStudentIndexes() {
  const collection = getStudentCollection();
  await collection.createIndex({ studentType: 1, isPublic: 1 }, { name: "students_public_type_index" });
  await collection.createIndex({ fullName: 1 }, { name: "students_name_index" });
  console.log("Student indexes created");
}
