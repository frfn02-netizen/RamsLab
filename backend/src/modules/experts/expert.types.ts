import type { ObjectId } from "mongodb";

export interface ExpertEducation {
  degree: string;
  field: string;
  institution: string;
  startYear?: number;
  endYear?: number;
}

export interface Expert {
  _id?: ObjectId;
  name: string;
  title?: string;
  employeeId?: string;
  nip?: string;
  nidn?: string;
  faculty?: string;
  department?: string;
  institution?: string;
  program?: string;
  position?: string;
  phone?: string;
  photo?: string;
  bio?: string;
  linkedin?: string;
  specialization: string[];
  showNip: boolean;
  showNidn: boolean;
  education?: ExpertEducation[];
  sintaUrl?: string;
  googleScholarUrl?: string;
  scopusUrl?: string;
  orcidUrl?: string;
  hIndex?: number;
  publicationCount?: number;
  projectCount?: number;
  awardCount?: number;
  published: boolean;
  isPublic: boolean;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}
