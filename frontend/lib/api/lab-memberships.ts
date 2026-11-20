import { apiRequest } from "./client";
import type {
  LabMembershipCandidate,
  LabMembershipPage,
  LabMembershipRecord,
  LabMembershipStatus,
} from "@/types/lab-membership";

export const getLabMemberships = (params: {
  q?: string;
  status?: LabMembershipStatus;
  limit?: number;
  offset?: number;
} = {}) => {
  const query = new URLSearchParams();
  if (params.q) query.set("q", params.q);
  if (params.status) query.set("status", params.status);
  if (params.limit !== undefined) query.set("limit", String(params.limit));
  if (params.offset !== undefined) query.set("offset", String(params.offset));
  return apiRequest<LabMembershipPage>(
    `/lab-memberships${query.size ? `?${query.toString()}` : ""}`,
  );
};

export const searchLabMembershipCandidates = (params: {
  q?: string;
  limit?: number;
} = {}) => {
  const query = new URLSearchParams();
  if (params.q) query.set("q", params.q);
  if (params.limit !== undefined) query.set("limit", String(params.limit));
  return apiRequest<LabMembershipCandidate[]>(
    `/lab-memberships/candidates${query.size ? `?${query.toString()}` : ""}`,
  );
};

export const addLabMembership = (userId: string) =>
  apiRequest<LabMembershipRecord>("/lab-memberships", {
    method: "POST",
    body: JSON.stringify({ userId }),
  });

export const updateLabMembershipStatus = (
  userId: string,
  status: LabMembershipStatus,
) =>
  apiRequest<LabMembershipRecord>(
    `/lab-memberships/${encodeURIComponent(userId)}`,
    {
      method: "PATCH",
      body: JSON.stringify({ status }),
    },
  );

export const deactivateLabMembership = (userId: string) =>
  apiRequest<LabMembershipRecord>(
    `/lab-memberships/${encodeURIComponent(userId)}`,
    { method: "DELETE" },
  );
