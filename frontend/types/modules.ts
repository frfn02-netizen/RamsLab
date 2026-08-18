export type ProjectStatus = "PLANNING" | "ONGOING" | "COMPLETED";
export type ProjectCategory = "RESEARCH" | "CONSULTING" | "DEVELOPMENT" | "OTHER";

export interface Project {
  _id: string;
  title: string;
  slug: string;
  description: string;
  category: ProjectCategory;
  partnerIds: string[];
  year: number;
  status: ProjectStatus;
  image?: string;
  technologies: string[];
  published: boolean;
  createdAt: string;
  updatedAt: string;
}

export type ProjectInput = Omit<Project, "_id" | "createdAt" | "updatedAt">;
export type ProjectUpdateInput = Partial<ProjectInput>;

export type PartnerType = "UNIVERSITY" | "INDUSTRIAL";
export interface Partner {
  _id: string;
  name: string;
  type: PartnerType;
  logo?: string;
  website?: string;
  country?: string;
  description?: string;
  isFeatured: boolean;
  published: boolean;
  createdAt: string;
  updatedAt: string;
}
export type PartnerInput = Omit<Partner, "_id" | "type" | "createdAt" | "updatedAt">;
export type PartnerUpdateInput = Partial<PartnerInput>;

export interface Dosen {
  _id: string;
  userId: string;
  fullName: string;
  employeeId?: string;
  title?: string;
  position?: string;
  specialization: string[];
  email?: string;
  phone?: string;
  photo?: string;
  bio?: string;
  linkedin?: string;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}
export type DosenInput = Omit<Dosen, "_id" | "createdAt" | "updatedAt">;
export type DosenUpdateInput = Partial<Omit<DosenInput, "userId">>;

export type TrackingType = "GRADUATION" | "EMPLOYMENT" | "PROMOTION" | "EDUCATION" | "ENTREPRENEURSHIP" | "JOB_SEEKING" | "OTHER";
export interface AlumniTracking {
  _id: string;
  alumniId: string;
  type: TrackingType;
  title: string;
  company?: string;
  position?: string;
  institution?: string;
  location?: string;
  startDate: string;
  endDate: string | null;
  description?: string;
  createdAt: string;
  updatedAt: string;
}
export type TrackingInput = Omit<AlumniTracking, "_id" | "alumniId" | "createdAt" | "updatedAt">;
export type TrackingUpdateInput = Partial<TrackingInput>;

export interface ResearchAreaText {
  en: string;
  id: string;
}

export interface ResearchArea {
  _id: string;
  code: string;
  slug: string;
  title: ResearchAreaText;
  description: ResearchAreaText;
  methods: { en: [string, string, string]; id: [string, string, string] };
  applications: ResearchAreaText;
  image?: string;
  order: number;
  published: boolean;
  createdAt: string;
  updatedAt: string;
  updatedBy?: string;
}

export type ResearchAreaInput = Omit<ResearchArea, "_id" | "createdAt" | "updatedAt">;
export type ResearchAreaUpdateInput = Partial<ResearchAreaInput>;

export type PublicResearchArea = Omit<ResearchArea, "_id" | "createdAt" | "updatedAt" | "updatedBy">;
