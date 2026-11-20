import { Collection, ObjectId } from "mongodb";
import { getDatabase } from "../../config/database.js";

export type AuthAuditAction =
  | "PASSWORD_CHANGED"
  | "PASSWORD_RESET_COMPLETED"
  | "ADMIN_PASSWORD_RESET";

export interface AuthAuditLog {
  _id?: ObjectId;
  action: AuthAuditAction;
  actorUserId: ObjectId | null;
  targetUserId: ObjectId;
  ip?: string;
  createdAt: Date;
}

const AUTH_AUDIT_COLLECTION = "auth_audit_logs";

export function getAuthAuditCollection(): Collection<AuthAuditLog> {
  return getDatabase().collection<AuthAuditLog>(AUTH_AUDIT_COLLECTION);
}

export async function recordAuthAudit(
  entry: Omit<AuthAuditLog, "_id" | "createdAt">,
): Promise<void> {
  try {
    await getAuthAuditCollection().insertOne({
      ...entry,
      createdAt: new Date(),
    });
  } catch (error) {
    console.error("Failed to record authentication audit event", {
      action: entry.action,
      error: error instanceof Error ? error.message : "unknown error",
    });
  }
}

export async function createAuthAuditIndexes(): Promise<void> {
  const collection = getAuthAuditCollection();
  await collection.createIndex(
    { targetUserId: 1, createdAt: -1 },
    { name: "auth_audit_target_index" },
  );
  await collection.createIndex(
    { actorUserId: 1, createdAt: -1 },
    { name: "auth_audit_actor_index" },
  );
}
