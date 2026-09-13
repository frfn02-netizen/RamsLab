import { Collection, ObjectId } from "mongodb";
import { getDatabase } from "../../config/database.js";
import type { AlumniAuditLog } from "./alumni-audit.types.js";

const AUDIT_COLLECTION = "alumni_audit_logs";

export function getAlumniAuditCollection(): Collection<AlumniAuditLog> {
  return getDatabase().collection<AlumniAuditLog>(AUDIT_COLLECTION);
}

export async function createAuditLog(
  log: Omit<AlumniAuditLog, "_id">,
): Promise<void> {
  await getAlumniAuditCollection().insertOne(log);
}

export async function findAuditLogsByAlumniId(
  alumniId: ObjectId,
): Promise<AlumniAuditLog[]> {
  return getAlumniAuditCollection()
    .find({ alumniId })
    .sort({ createdAt: -1 })
    .toArray();
}

export async function findAuditLogsWithUserNames(alumniId: ObjectId): Promise<
  (AlumniAuditLog & {
    userName?: string;
    alumniFullName?: string;
  })[]
> {
  const logs = await findAuditLogsByAlumniId(alumniId);
  if (logs.length === 0) return [];

  const userIds = [...new Set(logs.map((l) => l.userId.toString()))];
  const users = await getDatabase()
    .collection("users")
    .find({ _id: { $in: userIds.map((id) => new ObjectId(id)) } })
    .project({ _id: 1, email: 1 })
    .toArray();

  const alumniIds = [...new Set(logs.map((l) => l.alumniId.toString()))];
  const alumniRecords = await getDatabase()
    .collection("alumni")
    .find({ _id: { $in: alumniIds.map((id) => new ObjectId(id)) } })
    .project({ _id: 1, fullName: 1 })
    .toArray();

  const userById = new Map(users.map((u) => [u._id.toString(), u]));
  const alumniById = new Map(alumniRecords.map((a) => [a._id.toString(), a]));

  return logs.map((log) => ({
    ...log,
    userName: userById.get(log.userId.toString())?.email ?? "Unknown user",
    alumniFullName:
      alumniById.get(log.alumniId.toString())?.fullName ?? "Unknown alumni",
  }));
}

export async function createAlumniAuditIndexes(): Promise<void> {
  const collection = getAlumniAuditCollection();
  await collection.createIndex({ alumniId: 1, createdAt: -1 });
  await collection.createIndex({ userId: 1 });
}
