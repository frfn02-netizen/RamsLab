export type LabMembershipStatus = "ACTIVE" | "INACTIVE";

export interface LabMembershipUser {
  id: string;
  displayName?: string;
  email: string;
  role: "ADMIN" | "DOSEN" | "STUDENT" | "ALUMNI";
  isActive: boolean;
}

export interface LabMembershipRecord {
  userId: string;
  labId: string;
  status: LabMembershipStatus;
  joinedAt: string;
  updatedAt: string;
  user: LabMembershipUser | null;
  createdBy: LabMembershipUser | null;
  updatedBy: LabMembershipUser | null;
}

export interface LabMembershipPage {
  items: LabMembershipRecord[];
  pagination: {
    limit: number;
    offset: number;
    hasMore: boolean;
    nextOffset: number | null;
  };
}

export interface LabMembershipCandidate {
  id: string;
  displayName?: string;
  email: string;
  role: "ADMIN" | "DOSEN" | "STUDENT" | "ALUMNI";
  isActive: boolean;
}
