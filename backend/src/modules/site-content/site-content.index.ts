import { getSiteContentCollection } from "./site-content.repository.js";

export async function createSiteContentIndexes() {
  await getSiteContentCollection().createIndex(
    { key: 1 },
    { unique: true, name: "site_content_key_unique" },
  );
  console.log("✅ Site content indexes created");
}
