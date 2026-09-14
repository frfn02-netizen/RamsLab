import type { Request, Response } from "express";
import { ObjectId } from "mongodb";
import { ZodError } from "zod";
import { createVideoSchema, updateVideoSchema } from "./video.schema.js";
import {
  createVideo,
  deleteVideo,
  findAllVideos,
  findVideoById,
  getEffectiveThumbnail,
  updateVideo,
} from "./video.repository.js";
import type { HomepageVideo, PublicHomepageVideo } from "./video.types.js";

function validationError(error: unknown): error is ZodError {
  return error instanceof ZodError;
}

function adminVideo(video: HomepageVideo) {
  return {
    ...video,
    _id: video._id?.toString(),
    createdAt: video.createdAt.toISOString(),
    updatedAt: video.updatedAt.toISOString(),
    updatedBy: video.updatedBy?.toString() ?? null,
  };
}

export function publicVideo(video: HomepageVideo): PublicHomepageVideo {
  return {
    id: video._id?.toString() ?? "",
    youtubeUrl: video.youtubeUrl,
    youtubeVideoId: video.youtubeVideoId,
    title: video.title ?? null,
    thumbnailUrl: getEffectiveThumbnail(video),
    isFeatured: video.isFeatured,
    order: video.order,
  };
}

export async function getVideoListController(_req: Request, res: Response) {
  try {
    return res.json({
      success: true,
      data: (await findAllVideos()).map(adminVideo),
    });
  } catch {
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch videos" });
  }
}

export async function getVideoController(req: Request, res: Response) {
  const id = req.params.id as string;
  if (!ObjectId.isValid(id)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid video ID" });
  }
  try {
    const video = await findVideoById(id);
    if (!video) {
      return res
        .status(404)
        .json({ success: false, message: "Video not found" });
    }
    return res.json({ success: true, data: adminVideo(video) });
  } catch {
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch video" });
  }
}

export async function createVideoController(req: Request, res: Response) {
  try {
    const video = await createVideo(
      createVideoSchema.parse(req.body),
      req.user?.userId,
    );
    return res.status(201).json({ success: true, data: adminVideo(video) });
  } catch (error: unknown) {
    if (validationError(error)) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: error.issues,
      });
    }
    const message =
      error instanceof Error ? error.message : "Failed to create video";
    return res.status(500).json({ success: false, message });
  }
}

export async function updateVideoController(req: Request, res: Response) {
  const id = req.params.id as string;
  if (!ObjectId.isValid(id)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid video ID" });
  }
  try {
    const video = await updateVideo(
      id,
      updateVideoSchema.parse(req.body),
      req.user?.userId,
    );
    if (!video) {
      return res
        .status(404)
        .json({ success: false, message: "Video not found" });
    }
    return res.json({ success: true, data: adminVideo(video) });
  } catch (error: unknown) {
    if (validationError(error)) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: error.issues,
      });
    }
    const message =
      error instanceof Error ? error.message : "Failed to update video";
    return res.status(500).json({ success: false, message });
  }
}

export async function deleteVideoController(req: Request, res: Response) {
  const id = req.params.id as string;
  if (!ObjectId.isValid(id)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid video ID" });
  }
  try {
    if (!(await deleteVideo(id))) {
      return res
        .status(404)
        .json({ success: false, message: "Video not found" });
    }
    return res.json({ success: true, message: "Video deleted successfully" });
  } catch {
    return res
      .status(500)
      .json({ success: false, message: "Failed to delete video" });
  }
}

export async function getPublicHomepageVideosController(
  _req: Request,
  res: Response,
) {
  try {
    const videos = await findAllVideos({ publishedOnly: true });
    return res.json({ success: true, data: videos.map(publicVideo) });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch homepage videos",
    });
  }
}
