import { ObjectId } from "mongodb";

export interface AlumniAuditChange {
  oldValue: unknown;
  newValue: unknown;
}

export interface AlumniAuditLog {
  _id?: ObjectId;
  alumniId: ObjectId;
  userId: ObjectId;
  action: "UPDATE";
  changes: Record<string, AlumniAuditChange>;
  createdAt: Date;
}
