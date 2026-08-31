import { Collection, ObjectId } from "mongodb";
import { getDatabase } from "../../config/database.js";
import type {
  SiteContentContent,
  SiteContentDocument,
  SiteContentKey,
} from "./site-content.types.js";

const SITE_CONTENT_COLLECTION = "site_content";

export function getSiteContentCollection(): Collection<SiteContentDocument> {
  return getDatabase().collection<SiteContentDocument>(SITE_CONTENT_COLLECTION);
}

export async function findAllSiteContent(): Promise<SiteContentDocument[]> {
  return getSiteContentCollection().find({}).sort({ key: 1 }).toArray();
}

export async function findSiteContentByKey(
  key: SiteContentKey,
): Promise<SiteContentDocument | null> {
  return getSiteContentCollection().findOne({ key });
}

export async function findLatestSiteContent(): Promise<SiteContentDocument | null> {
  return getSiteContentCollection().findOne(
    {},
    { sort: { updatedAt: -1, key: 1 } },
  );
}

export async function updateSiteContent(
  key: SiteContentKey,
  content: SiteContentContent,
  updatedBy?: string,
): Promise<SiteContentDocument | null> {
  return getSiteContentCollection().findOneAndUpdate(
    { key },
    {
      $set: {
        key,
        page: key,
        content,
        updatedAt: new Date(),
        ...(updatedBy && ObjectId.isValid(updatedBy)
          ? { updatedBy: new ObjectId(updatedBy) }
          : {}),
      },
    },
    { returnDocument: "after" },
  );
}

export async function upsertSiteContent(
  key: SiteContentKey,
  content: SiteContentContent,
): Promise<void> {
  const collection = getSiteContentCollection();
  const existing = await collection.findOne({ key });
  const now = new Date();
  if (existing) {
    await collection.updateOne(
      { _id: existing._id },
      { $set: { page: key, content, updatedAt: now } },
    );
    return;
  }
  await collection.insertOne({
    key,
    page: key,
    content,
    createdAt: now,
    updatedAt: now,
  });
}
