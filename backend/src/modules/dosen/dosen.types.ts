import { ObjectId } from "mongodb";

export interface DosenEducation {
  degree: string;
  field: string;
  institution: string;
  startYear?: number;
  endYear?: number;
}

export interface Dosen {
  _id?: ObjectId;

  userId: ObjectId;

  fullName: string;

  employeeId?: string;

  nip?: string;

  nidn?: string;

  faculty?: string;

  department?: string;

  institution?: string;

  program?: string;

  title?: string;

  position?: string;

  specialization: string[];

  email?: string;

  phone?: string;

  photo?: string;

  bio?: string;

  linkedin?: string;

  showNip: boolean;

  showNidn: boolean;

  showEmail: boolean;

  education?: DosenEducation[];

  sintaUrl?: string;

  googleScholarUrl?: string;

  scopusUrl?: string;

  orcidUrl?: string;

  hIndex?: number;

  publicationCount?: number;

  projectCount?: number;

  awardCount?: number;

  isPublic: boolean;

  createdAt: Date;

  updatedAt: Date;
}
