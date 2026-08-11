import { getDosenCollection } from "./dosen.repository.js";

export async function createDosenIndexes() {
  const collection = getDosenCollection();

  await collection.createIndex(
    { userId: 1 },
    {
      unique: true,
      name: "dosen_user_unique",
    }
  );

  await collection.createIndex(
    { employeeId: 1 },
    {
      unique: true,
      sparse: true,
      name: "dosen_employee_id_unique",
    }
  );

  await collection.createIndex(
    { isPublic: 1 },
    {
      name: "dosen_public_index",
    }
  );

  console.log("Dosen indexes created");
}