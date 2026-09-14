import { Collection, ObjectId } from "mongodb";
import { getDatabase } from "../../config/database.js";
import { SECURITY_LIMITS } from "../../config/security.js";
import type { CreateVideoInput, UpdateVideoInput } from "./video.schema.js";
import type { HomepageVideo } from "./video.types.js";
import {
  extractYouTubeVideoId,
  youtubeThumbnailUrl,
  youtubeFallbackThumbnailUrl,
} from "./video.youtube.js";

const VIDEOS_COLLECTION = "homepage_videos";

export function getVideosCollection(): Collection<HomepageVideo> {
  return getDatabase().collection<HomepageVideo>(VIDEOS_COLLECTION);
}

export async function findAllVideos(options?: {
  publishedOnly?: boolean;
}): Promise<HomepageVideo[]> {
  const filter = options?.publishedOnly ? { published: true } : {};
  return getVideosCollection()
    .find(filter)
    .sort({ order: 1, createdAt: -1 })
    .limit(SECURITY_LIMITS.maxListResults)
    .toArray();
}

export async function findVideoById(id: string): Promise<HomepageVideo | null> {
  if (!ObjectId.isValid(id)) return null;
  return getVideosCollection().findOne({ _id: new ObjectId(id) });
}

export async function createVideo(
  input: CreateVideoInput,
  updatedBy?: string,
): Promise<HomepageVideo> {
  const videoId = extractYouTubeVideoId(input.youtubeUrl);
  if (!videoId) throw new Error("Invalid YouTube URL");

  const now = new Date();
  const video: HomepageVideo = {
    youtubeUrl: input.youtubeUrl,
    youtubeVideoId: videoId,
    title: input.title ?? null,
    thumbnailUrl: input.thumbnailUrl ?? null,
    isFeatured: input.isFeatured ?? false,
    order: input.order ?? 0,
    published: input.published ?? false,
    createdAt: now,
    updatedAt: now,
    ...(updatedBy && ObjectId.isValid(updatedBy)
      ? { updatedBy: new ObjectId(updatedBy) }
      : {}),
  };

  if (video.isFeatured) {
    await clearFeaturedExcept(null);
  }

  const result = await getVideosCollection().insertOne(video);
  return { ...video, _id: result.insertedId };
}

export async function updateVideo(
  id: string,
  input: UpdateVideoInput,
  updatedBy?: string,
): Promise<HomepageVideo | null> {
  if (!ObjectId.isValid(id)) return null;

  const update: Record<string, unknown> = { updatedAt: new Date() };

  if (input.youtubeUrl !== undefined) {
    const videoId = extractYouTubeVideoId(input.youtubeUrl);
    if (!videoId) throw new Error("Invalid YouTube URL");
    update.youtubeUrl = input.youtubeUrl;
    update.youtubeVideoId = videoId;
  }
  if (input.title !== undefined) update.title = input.title ?? null;
  if (input.thumbnailUrl !== undefined)
    update.thumbnailUrl = input.thumbnailUrl ?? null;
  if (input.isFeatured !== undefined) {
    update.isFeatured = input.isFeatured;
    if (input.isFeatured) await clearFeaturedExcept(id);
  }
  if (input.order !== undefined) update.order = input.order;
  if (input.published !== undefined) update.published = input.published;

  if (updatedBy && ObjectId.isValid(updatedBy)) {
    update.updatedBy = new ObjectId(updatedBy);
  }

  return getVideosCollection().findOneAndUpdate(
    { _id: new ObjectId(id) },
    { $set: update },
    { returnDocument: "after" },
  );
}

async function clearFeaturedExcept(excludeId: string | null) {
  const filter: Record<string, unknown> = { isFeatured: true };
  if (excludeId && ObjectId.isValid(excludeId)) {
    filter._id = { $ne: new ObjectId(excludeId) };
  }
  await getVideosCollection().updateMany(filter, {
    $set: { isFeatured: false, updatedAt: new Date() },
  });
}

export async function deleteVideo(id: string): Promise<boolean> {
  if (!ObjectId.isValid(id)) return false;
  const result = await getVideosCollection().deleteOne({
    _id: new ObjectId(id),
  });
  return result.deletedCount === 1;
}

export function getEffectiveThumbnail(video: HomepageVideo): string {
  return video.thumbnailUrl || youtubeThumbnailUrl(video.youtubeVideoId);
}

export function getSafeThumbnail(video: HomepageVideo): string {
  return (
    video.thumbnailUrl || youtubeFallbackThumbnailUrl(video.youtubeVideoId)
  );
}
