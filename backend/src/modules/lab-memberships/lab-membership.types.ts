import type { ObjectId } from "mongodb";
import type { UserRole } from "../users/user.types.js";

export const LAB_MEMBERSHIP_STATUSES = ["ACTIVE", "INACTIVE"] as const;
export type LabMembershipStatus =
  (typeof LAB_MEMBERSHIP_STATUSES)[number];

export interface LabMembership {
  _id?: ObjectId;
  userId: ObjectId;
  labId: string;
  status: LabMembershipStatus;
  revision?: number;
  lastTransitionId?: string;
  joinedAt: Date;
  updatedAt: Date;
  createdBy: ObjectId;
  updatedBy: ObjectId;
}

export const LAB_MEMBERSHIP_AUDIT_ACTIONS = [
  "ADDED",
  "ACTIVATED",
  "DEACTIVATED",
] as const;
export type LabMembershipAuditAction =
  (typeof LAB_MEMBERSHIP_AUDIT_ACTIONS)[number];

export const LAB_MEMBERSHIP_AUDIT_STATUSES = [
  "PENDING",
  "APPLIED",
  "FAILED",
  "SUPERSEDED",
] as const;
export type LabMembershipAuditStatus =
  (typeof LAB_MEMBERSHIP_AUDIT_STATUSES)[number];

export interface LabMembershipAuditLog {
  _id?: ObjectId;
  eventKey?: string;
  transitionId?: string;
  labId: string;
  memberUserId: ObjectId;
  action: LabMembershipAuditAction;
  actorUserId: ObjectId;
  status?: LabMembershipAuditStatus;
  expectedStatus?: LabMembershipStatus | null;
  targetStatus?: LabMembershipStatus;
  expectedRevision?: number | null;
  resultRevision?: number;
  attempts?: number;
  lastError?: string | null;
  createdAt: Date;
  updatedAt?: Date;
  appliedAt?: Date | null;
}

export interface LabMembershipUserSummary {
  id: string;
  displayName?: string;
  email: string;
  role: UserRole;
  isActive: boolean;
}

export interface LabMembershipResponse {
  userId: string;
  labId: string;
  status: LabMembershipStatus;
  joinedAt: string;
  updatedAt: string;
  user: LabMembershipUserSummary | null;
  createdBy: LabMembershipUserSummary | null;
  updatedBy: LabMembershipUserSummary | null;
}

export interface LabMembershipCandidate {
  id: string;
  displayName?: string;
  email: string;
  role: UserRole;
  isActive: boolean;
}
