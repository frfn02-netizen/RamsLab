import { getPartnersCollection } from "./partner.repository.js";

export async function createPartnerIndexes() {
  const collection = getPartnersCollection();

  await collection.createIndex(
    { name: 1 },
    {
      name: "partners_name_index",
    }
  );

  await collection.createIndex(
    { type: 1 },
    {
      name: "partners_type_index",
    }
  );

  await collection.createIndex(
    { published: 1 },
    {
      name: "partners_published_index",
    }
  );

  await collection.createIndex(
    { isFeatured: 1 },
    {
      name: "partners_featured_index",
    }
  );

  console.log("✅ Partner indexes created");
}