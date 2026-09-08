import { getEventsCollection } from "./event.repository.js";

export async function createEventIndexes() {
  const collection = getEventsCollection();
  await collection.createIndex(
    { published: 1, order: 1 },
    { name: "events_public_listing_index" },
  );
  await collection.createIndex(
    { "title.en": 1 },
    { name: "events_title_en_index" },
  );
  console.log("Events indexes created");
}
