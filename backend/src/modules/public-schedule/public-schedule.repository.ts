import { ObjectId, type Filter } from "mongodb";
import { SECURITY_LIMITS } from "../../config/security.js";
import { getMeetingsCollection } from "../meetings/meeting.repository.js";
import type { Meeting } from "../meetings/meeting.types.js";
import type { PublicScheduleQuery } from "./public-schedule.types.js";

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function publicScheduleFilter(query: PublicScheduleQuery): Filter<Meeting> {
  const conditions: Filter<Meeting>[] = [
    { visibility: "INTERNAL" },
    {
      $or: [
        { cancelledAt: { $exists: false } },
        { cancelledAt: null },
      ],
    } as unknown as Filter<Meeting>,
  ];

  if (query.from) conditions.push({ endAt: { $gt: query.from } });
  if (query.to) conditions.push({ startAt: { $lt: query.to } });
  if (query.mode) conditions.push({ mode: query.mode });
  if (query.q) {
    const pattern = new RegExp(escapeRegExp(query.q), "i");
    conditions.push({ $or: [{ title: pattern }, { clientName: pattern }] });
  }

  return { $and: conditions };
}

export async function findPublicScheduleMeetings(query: PublicScheduleQuery) {
  const filter = publicScheduleFilter(query);
  const collection = getMeetingsCollection();
  const [items, total] = await Promise.all([
    collection
      .find(filter)
      .sort({ startAt: 1, _id: 1 })
      .skip((query.page - 1) * query.limit)
      .limit(Math.min(query.limit, SECURITY_LIMITS.maxPageSize))
      .toArray(),
    collection.countDocuments(filter),
  ]);
  return { items, total };
}

export async function findPublicScheduleMeetingById(id: string) {
  if (!ObjectId.isValid(id)) return null;
  return getMeetingsCollection().findOne({
    _id: new ObjectId(id),
    ...publicScheduleFilter({ page: 1, limit: 1 }),
  });
}
