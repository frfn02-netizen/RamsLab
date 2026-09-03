import { getResearchHighlightsCollection } from "./research-highlight.repository.js";

export async function createResearchHighlightIndexes() {
  const collection = getResearchHighlightsCollection();
  await collection.createIndex(
    { publicationId: 1 },
    { name: "research_highlights_publication_index" },
  );
  await collection.createIndex(
    { published: 1, order: 1 },
    { name: "research_highlights_public_listing_index" },
  );
  console.log("✅ Research highlight indexes created");
}
