import { getAlumniCollection } from "./alumni.repository.js";

export async function createAlumniIndexes() {
  const collection = getAlumniCollection();

  await collection.createIndex(
    { userId: 1 },
    {
      unique: true,
      name: "alumni_user_unique",
    },
  );

  await collection.createIndex(
    { createdAt: -1 },
    { name: "alumni_created_at_index" },
  );

  const indexes = await collection.indexes();
  const existingNimIndex = indexes.find(
    (index) => index.name === "alumni_nim_unique",
  );
  if (existingNimIndex && !existingNimIndex.sparse) {
    await collection.dropIndex("alumni_nim_unique");
  }
  await collection.createIndex(
    { nim: 1 },
    { unique: true, sparse: true, name: "alumni_nim_unique" },
  );

  await collection.createIndex(
    { graduationYear: 1 },
    {
      name: "alumni_graduation_year_index",
    },
  );

  await collection.createIndex(
    { currentStatus: 1 },
    {
      name: "alumni_status_index",
    },
  );

  await collection.createIndex(
    { isPublic: 1 },
    {
      name: "alumni_public_index",
    },
  );

  console.log("Alumni indexes created");
}
