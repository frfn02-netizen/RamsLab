export type AlumniStatus =
  | "WORKING"
  | "STUDYING"
  | "ENTREPRENEUR"
  | "SEEKING_JOB"
  | "OTHER";

export interface Alumni {
  _id: string;
  userId: string;

  fullName: string;
  nim: string;
  photo?: string;

  graduationYear: number;
  program: string;

  phone?: string;
  location?: string;

  currentStatus: AlumniStatus;
  currentCompany?: string;
  currentPosition?: string;

  linkedin?: string;
  bio?: string;

  careerHistory: CareerHistory[];
  educationHistory: EducationHistory[];

  isPublic: boolean;

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

export type AlumniCreateInput = Omit<Alumni, "_id" | "createdAt" | "updatedAt">;
export type AlumniUpdateInput = Partial<Omit<Alumni, "_id" | "userId" | "nim" | "createdAt" | "updatedAt">>;
