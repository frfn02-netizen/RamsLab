import { Collection, ObjectId } from "mongodb";
import { getDatabase } from "../../config/database.js";
import { SECURITY_LIMITS } from "../../config/security.js";
import type { CreateEventInput, UpdateEventInput } from "./event.schema.js";
import type { Event, EventImage } from "./event.types.js";

const EVENTS_COLLECTION = "events";

export function getEventsCollection(): Collection<Event> {
  return getDatabase().collection<Event>(EVENTS_COLLECTION);
}

export async function findAllEvents(options?: {
  publishedOnly?: boolean;
}): Promise<Event[]> {
  const filter = options?.publishedOnly ? { published: true } : {};
  return getEventsCollection()
    .find(filter)
    .sort({ order: 1, eventDate: -1, "title.en": 1 })
    .limit(SECURITY_LIMITS.maxListResults)
    .toArray();
}

export async function findEventById(id: string): Promise<Event | null> {
  if (!ObjectId.isValid(id)) return null;
  return getEventsCollection().findOne({ _id: new ObjectId(id) });
}

export async function createEvent(
  input: CreateEventInput,
  updatedBy?: string,
): Promise<Event> {
  const now = new Date();
  const event: Event = {
    ...input,
    createdAt: now,
    updatedAt: now,
    ...(updatedBy && ObjectId.isValid(updatedBy)
      ? { updatedBy: new ObjectId(updatedBy) }
      : {}),
  };
  const result = await getEventsCollection().insertOne(event);
  return { ...event, _id: result.insertedId };
}

export async function updateEvent(
  id: string,
  input: UpdateEventInput,
  updatedBy?: string,
): Promise<Event | null> {
  if (!ObjectId.isValid(id)) return null;
  return getEventsCollection().findOneAndUpdate(
    { _id: new ObjectId(id) },
    {
      $set: {
        ...input,
        updatedAt: new Date(),
        ...(updatedBy && ObjectId.isValid(updatedBy)
          ? { updatedBy: new ObjectId(updatedBy) }
          : {}),
      },
    },
    { returnDocument: "after" },
  );
}

export async function setEventImage(
  id: string,
  image: EventImage,
  updatedBy?: string,
): Promise<Event | null> {
  if (!ObjectId.isValid(id)) return null;
  return getEventsCollection().findOneAndUpdate(
    { _id: new ObjectId(id) },
    {
      $set: {
        image,
        updatedAt: new Date(),
        ...(updatedBy && ObjectId.isValid(updatedBy)
          ? { updatedBy: new ObjectId(updatedBy) }
          : {}),
      },
    },
    { returnDocument: "after" },
  );
}

export async function deleteEvent(id: string): Promise<boolean> {
  if (!ObjectId.isValid(id)) return false;
  const result = await getEventsCollection().deleteOne({
    _id: new ObjectId(id),
  });
  return result.deletedCount === 1;
}
