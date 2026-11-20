import {
  getLabMembershipAuditCollection,
  getLabMembershipsCollection,
} from "./lab-membership.repository.js";

export async function createLabMembershipIndexes(): Promise<void> {
  const memberships = getLabMembershipsCollection();
  await memberships.createIndex(
    { labId: 1, userId: 1 },
    { unique: true, name: "lab_membership_unique" },
  );
  await memberships.createIndex(
    { labId: 1, status: 1, updatedAt: -1 },
    { name: "lab_membership_active_index" },
  );

  const audit = getLabMembershipAuditCollection();
  await audit.createIndex(
    { eventKey: 1 },
    { unique: true, sparse: true, name: "lab_membership_audit_event_unique" },
  );
  await audit.createIndex(
    { labId: 1, memberUserId: 1, createdAt: -1 },
    { name: "lab_membership_audit_member_index" },
  );
  await audit.createIndex(
    { labId: 1, memberUserId: 1, status: 1, createdAt: 1 },
    { name: "lab_membership_audit_recovery_index" },
  );
  await audit.createIndex(
    { labId: 1, status: 1, updatedAt: 1 },
    { name: "lab_membership_audit_pending_index" },
  );
  await audit.createIndex(
    { actorUserId: 1, createdAt: -1 },
    { name: "lab_membership_audit_actor_index" },
  );

  console.log("Lab membership indexes verified");
}
