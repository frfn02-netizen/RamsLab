import type { Request, Response } from "express";
import { ObjectId } from "mongodb";
import { ZodError } from "zod";
import { createEventSchema, updateEventSchema } from "./event.schema.js";
import {
  removeEventImage as removeCloudinaryEventImage,
  uploadEventImage,
} from "../../lib/cloudinary.js";
import {
  createEvent,
  deleteEvent,
  findAllEvents,
  findEventById,
  setEventImage,
  updateEvent,
} from "./event.repository.js";
import type { Event, PublicEvent } from "./event.types.js";

const MAX_EVENT_IMAGE_BYTES = 3 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function validationError(error: unknown): error is ZodError {
  return error instanceof ZodError;
}

function optionalQueryText(value: unknown) {
  const text = typeof value === "string" ? value.trim() : "";
  return text.slice(0, 5000);
}

function adminEvent(event: Event) {
  return {
    ...event,
    _id: event._id?.toString(),
    eventDate: event.eventDate ? event.eventDate.toISOString() : null,
    updatedBy: event.updatedBy?.toString(),
  };
}

export function publicEvent(event: Event): PublicEvent {
  return {
    id: event._id?.toString() ?? "",
    title: event.title,
    description: event.description,
    image: event.image,
    eventDate: event.eventDate ? event.eventDate.toISOString() : null,
    location: event.location,
    order: event.order,
  };
}

export async function getEventListController(_req: Request, res: Response) {
  try {
    return res.json({
      success: true,
      data: (await findAllEvents()).map(adminEvent),
    });
  } catch {
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch events" });
  }
}

export async function getEventController(req: Request, res: Response) {
  const id = req.params.id as string;
  if (!ObjectId.isValid(id)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid event ID" });
  }
  try {
    const event = await findEventById(id);
    if (!event) {
      return res
        .status(404)
        .json({ success: false, message: "Event not found" });
    }
    return res.json({ success: true, data: adminEvent(event) });
  } catch {
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch event" });
  }
}

export async function createEventController(req: Request, res: Response) {
  try {
    const event = await createEvent(
      createEventSchema.parse(req.body),
      req.user?.userId,
    );
    return res.status(201).json({ success: true, data: adminEvent(event) });
  } catch (error: unknown) {
    if (validationError(error)) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: error.issues,
      });
    }
    return res
      .status(500)
      .json({ success: false, message: "Failed to create event" });
  }
}

export async function updateEventController(req: Request, res: Response) {
  const id = req.params.id as string;
  if (!ObjectId.isValid(id)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid event ID" });
  }
  try {
    const event = await updateEvent(
      id,
      updateEventSchema.parse(req.body),
      req.user?.userId,
    );
    if (!event) {
      return res
        .status(404)
        .json({ success: false, message: "Event not found" });
    }
    return res.json({ success: true, data: adminEvent(event) });
  } catch (error: unknown) {
    if (validationError(error)) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: error.issues,
      });
    }
    return res
      .status(500)
      .json({ success: false, message: "Failed to update event" });
  }
}

export async function uploadEventImageController(req: Request, res: Response) {
  const id = req.params.id as string;
  if (!ObjectId.isValid(id)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid event ID" });
  }

  const existing = await findEventById(id);
  if (!existing) {
    return res.status(404).json({ success: false, message: "Event not found" });
  }

  const contentType = (req.headers["content-type"] ?? "")
    .split(";", 1)[0]
    .trim()
    .toLowerCase();
  const image = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
  if (!ALLOWED_IMAGE_TYPES.has(contentType)) {
    return res.status(415).json({
      success: false,
      message: "Only JPEG, PNG, and WebP images are supported",
    });
  }
  if (!image.length || image.length > MAX_EVENT_IMAGE_BYTES) {
    return res.status(413).json({
      success: false,
      message: "Image must be between 1 byte and 3 MB",
    });
  }

  let uploaded: { url: string; publicId: string };
  try {
    uploaded = await uploadEventImage(image);
  } catch {
    return res
      .status(502)
      .json({ success: false, message: "Event image upload failed" });
  }

  const alt = {
    en: optionalQueryText(req.query.altEn),
    id: optionalQueryText(req.query.altId),
  };

  let updated;
  try {
    updated = await setEventImage(
      id,
      {
        ...uploaded,
        ...(alt.en || alt.id ? { alt } : {}),
      },
      req.user?.userId,
    );
    if (!updated) {
      await removeCloudinaryEventImage(uploaded.publicId).catch(
        () => undefined,
      );
      return res
        .status(404)
        .json({ success: false, message: "Event not found" });
    }
  } catch {
    await removeCloudinaryEventImage(uploaded.publicId).catch(() => undefined);
    return res
      .status(500)
      .json({ success: false, message: "Failed to save event image" });
  }

  if (
    existing.image?.publicId &&
    existing.image.publicId !== uploaded.publicId
  ) {
    await removeCloudinaryEventImage(existing.image.publicId).catch(
      () => undefined,
    );
  }

  return res.json({ success: true, data: adminEvent(updated) });
}

export async function deleteEventController(req: Request, res: Response) {
  const id = req.params.id as string;
  if (!ObjectId.isValid(id)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid event ID" });
  }
  try {
    if (!(await deleteEvent(id))) {
      return res
        .status(404)
        .json({ success: false, message: "Event not found" });
    }
    return res.json({ success: true, message: "Event deleted successfully" });
  } catch {
    return res
      .status(500)
      .json({ success: false, message: "Failed to delete event" });
  }
}

export async function getPublicEventListController(
  _req: Request,
  res: Response,
) {
  try {
    const events = await findAllEvents({ publishedOnly: true });
    return res.json({ success: true, data: events.map(publicEvent) });
  } catch {
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch public events" });
  }
}
