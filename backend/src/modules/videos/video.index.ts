import { getVideosCollection } from "./video.repository.js";

export async function createVideoIndexes() {
  const collection = getVideosCollection();
  await collection.createIndex(
    { order: 1, createdAt: -1 },
    { name: "videos_order_created_index" },
  );
  await collection.createIndex(
    { published: 1, order: 1 },
    { name: "videos_published_order_index" },
  );
  await collection.createIndex(
    { isFeatured: 1 },
    { name: "videos_featured_index" },
  );
  console.log("✅ Homepage video indexes created");
}
