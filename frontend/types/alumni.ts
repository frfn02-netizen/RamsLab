export type AlumniStatus =
  "WORKING" | "STUDYING" | "ENTREPRENEUR" | "SEEKING_JOB" | "OTHER";
export type AlumniReviewStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface Alumni {
  _id: string;
  userId: string;

  fullName: string;
  nim: string;
  photo?: string;

  angkatan: number;
  program: string;

  phone?: string;
  location?: string;

  currentStatus: AlumniStatus;
  otherStatus?: string;
  currentCompany?: string;
  currentPosition?: string;

  linkedin?: string;
  bio?: string;

  careerHistory: CareerHistory[];
  educationHistory: EducationHistory[];

  isPublic: boolean;
  reviewStatus?: AlumniReviewStatus;
  reviewNote?: string | null;
  profileCompleted?: boolean;
  accountEmail?: string;
  accountActive?: boolean;
  mustChangePassword?: boolean;

  createdAt: string;
  updatedAt: string;
}

export interface CareerHistory {
  company: string;
  position: string;
  startDate: string;
  endDate: string | null;
  location?: string;
}

export interface EducationHistory {
  institution: string;
  degree: string;
  fieldOfStudy: string;
  startYear: number;
  endYear: number | null;
}

export interface AlumniListParams {
  page?: number;
  limit?: number;
  search?: string;
}

export interface AlumniListResponse {
  data: Alumni[];
  total: number;
}

export type AlumniUpdateInput = Partial<
  Omit<Alumni, "_id" | "userId" | "createdAt" | "updatedAt">
>;

export interface AlumniAuditChange {
  oldValue: unknown;
  newValue: unknown;
}

export interface AlumniAuditLog {
  _id: string;
  alumniId: string;
  userId: string;
  action: "UPDATE";
  changes: Record<string, AlumniAuditChange>;
  createdAt: string;
}
