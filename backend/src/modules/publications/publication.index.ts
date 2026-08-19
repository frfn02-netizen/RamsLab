import { getPublicationsCollection } from "./publication.repository.js";

export async function createPublicationIndexes() {
  const collection = getPublicationsCollection();
  await collection.createIndex({ year: -1, title: 1 }, { name: "publications_year_title_index" });
  await collection.createIndex({ doi: 1 }, { unique: true, partialFilterExpression: { doi: { $type: "string" } }, name: "publications_doi_unique" });
  await collection.createIndex({ normalizedTitle: 1, year: 1 }, { unique: true, partialFilterExpression: { doi: null }, name: "publications_title_year_without_doi_unique" });
  console.log("✅ Publication indexes created");
}
