import { getResearchAreasCollection } from "./research.repository.js";

export async function createResearchAreaIndexes() {
  const collection = getResearchAreasCollection();
  await collection.createIndex(
    { code: 1 },
    { unique: true, name: "research_areas_code_unique" },
  );
  await collection.createIndex(
    { slug: 1 },
    { unique: true, name: "research_areas_slug_unique" },
  );
  await collection.createIndex(
    { published: 1, order: 1 },
    { name: "research_areas_public_listing_index" },
  );
  console.log("✅ Research area indexes created");
}
