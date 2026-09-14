import type { PublicPerson } from "./people";

export type ProjectStatus = "PLANNING" | "ONGOING" | "COMPLETED";
export type ProjectCategory =
  "RESEARCH" | "CONSULTING" | "DEVELOPMENT" | "OTHER";

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
  featured: boolean;
  createdAt: string;
  updatedAt: string;
}

export type ProjectInput = Omit<Project, "_id" | "createdAt" | "updatedAt">;
export type ProjectUpdateInput = Partial<ProjectInput>;

export interface Publication {
  _id: string;
  title: string;
  authors: string[];
  publicationType: string;
  year: number;
  journal: string;
  doi: string | null;
  pdfUrl: string | null;
  pdfFilename?: string | null;
  topics: string[];
  methods: string[];
  createdBy?: string | null;
  updatedBy?: string | null;
  createdByEmail?: string | null;
  updatedByEmail?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PublicationFacets {
  years: number[];
  topics: string[];
  methods: string[];
}

export interface PublicationListResponse {
  data: Publication[];
  total: number;
  page: number;
  limit: number;
  facets: PublicationFacets;
}

export const PUBLICATION_TYPES = [
  "Article",
  "Review",
  "Conference Paper",
  "Book Chapter",
  "Proceedings",
  "Editorial",
  "Other",
] as const;

export type PublicationInput = Omit<
  Publication,
  "_id" | "createdAt" | "updatedAt"
>;
export type PublicationUpdateInput = Partial<PublicationInput>;

export interface ResearchHighlightImage {
  url: string;
  publicId?: string;
}

export interface ResearchHighlightPublication {
  id: string;
  title: string;
  authors: string[];
  year: number;
  journal: string;
  doi: string | null;
  pdfUrl: string | null;
}

export interface ResearchHighlight {
  id: string;
  headline: { en: string; id: string };
  image?: ResearchHighlightImage;
  order: number;
  published: boolean;
  publication: ResearchHighlightPublication;
  publicationId?: string;
  createdAt?: string;
  updatedAt?: string;
  updatedBy?: string | null;
}

export interface ResearchHighlightInput {
  headline: { en: string; id: string };
  publicationId: string;
  image?: ResearchHighlightImage;
  order: number;
  published: boolean;
}

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
  showOnHomepage: boolean;
  homepageOrder?: number;
  createdAt: string;
  updatedAt: string;
}
export type PartnerInput = Omit<
  Partner,
  "_id" | "type" | "createdAt" | "updatedAt"
>;
export type PartnerUpdateInput = Partial<PartnerInput>;

export interface ExpertEducation {
  degree: string;
  field: string;
  institution: string;
  startYear?: number;
  endYear?: number;
}

export interface Expert {
  _id: string;
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
  createdAt: string;
  updatedAt: string;
}
export type ExpertInput = Omit<Expert, "_id" | "createdAt" | "updatedAt">;
export type ExpertUpdateInput = Partial<ExpertInput>;

export interface Dosen {
  _id: string;
  userId: string;
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
  createdAt: string;
  updatedAt: string;
}
export interface DosenEducation {
  degree: string;
  field: string;
  institution: string;
  startYear?: number;
  endYear?: number;
}
export type DosenInput = Omit<Dosen, "_id" | "createdAt" | "updatedAt">;
export type DosenUpdateInput = Partial<Omit<DosenInput, "userId">>;

export type StudentType =
  "PHD_STUDENT" | "MASTER_STUDENT" | "UNDERGRADUATE_STUDENT";
export interface Student {
  _id: string;
  fullName: string;
  studentType: StudentType;
  program?: string;
  specialization: string[];
  photo?: string;
  bio?: string;
  linkedin?: string;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}
export type StudentInput = Omit<Student, "_id" | "createdAt" | "updatedAt">;
export type StudentUpdateInput = Partial<StudentInput>;

export type TrackingType =
  | "GRADUATION"
  | "EMPLOYMENT"
  | "PROMOTION"
  | "EDUCATION"
  | "ENTREPRENEURSHIP"
  | "JOB_SEEKING"
  | "OTHER";
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
export type TrackingInput = Omit<
  AlumniTracking,
  "_id" | "alumniId" | "createdAt" | "updatedAt"
>;
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
  downloadablePng?: string;
  order: number;
  published: boolean;
  createdAt: string;
  updatedAt: string;
  updatedBy?: string;
}

export type ResearchAreaInput = Omit<
  ResearchArea,
  "_id" | "createdAt" | "updatedAt"
>;
export type ResearchAreaUpdateInput = Partial<ResearchAreaInput>;

export type PublicResearchArea = Omit<
  ResearchArea,
  "_id" | "createdAt" | "updatedAt" | "updatedBy"
>;

export interface BilingualText {
  en: string;
  id: string;
}

export interface CmsEventImage {
  url: string;
  publicId?: string;
  alt?: BilingualText;
}

export interface CmsEvent {
  _id: string;
  title: BilingualText;
  description?: BilingualText;
  image?: CmsEventImage;
  eventDate?: string | null;
  location?: BilingualText;
  order: number;
  published: boolean;
  createdAt: string;
  updatedAt: string;
  updatedBy?: string;
}

export type CmsEventInput = Omit<
  CmsEvent,
  "_id" | "createdAt" | "updatedAt" | "updatedBy"
>;
export type CmsEventUpdateInput = Partial<CmsEventInput>;

export type PeopleRefKind = "DOSEN" | "STUDENT" | "ALUMNI";

export interface PeopleRef {
  kind: PeopleRefKind;
  id: string;
}

export interface PublicServiceExpert {
  _id: string;
  peopleRef?: PeopleRef;
  displayName?: string;
  expertise?: BilingualText;
  order: number;
  published: boolean;
  createdAt: string;
  updatedAt: string;
  updatedBy?: string;
}

export interface PublicServiceExpertInput {
  peopleRef: PeopleRef;
  displayName?: string;
  expertise?: BilingualText;
  order: number;
  published: boolean;
}
export type PublicServiceExpertUpdateInput = Partial<PublicServiceExpertInput>;

export interface PublicServiceCompany {
  id?: string;
  name: string;
  description?: BilingualText;
  order: number;
  published: boolean;
}

export interface PublicServiceJob {
  id?: string;
  name: BilingualText;
  description?: BilingualText;
  order: number;
  published: boolean;
}

export interface PublicServiceRecord {
  _id: string;
  code?: string;
  title: BilingualText;
  description?: BilingualText;
  shortDescription?: BilingualText;
  detailedDescription?: BilingualText;
  images: string[];
  companies: PublicServiceCompany[];
  jobs: PublicServiceJob[];
  order: number;
  published: boolean;
  createdAt: string;
  updatedAt: string;
  updatedBy?: string;
}

export type PublicServiceInput = Omit<
  PublicServiceRecord,
  "_id" | "createdAt" | "updatedAt" | "updatedBy"
>;
export type PublicServiceUpdateInput = Partial<PublicServiceInput>;

export interface PublicEvent {
  id: string;
  title: BilingualText;
  description?: BilingualText;
  image?: CmsEventImage;
  eventDate?: string | null;
  location?: BilingualText;
  order: number;
}

export interface PublicServicePageData {
  experts: Array<{
    id: string;
    peopleId: string;
    expertise?: BilingualText;
    order: number;
    person: PublicPerson;
  }>;
  services: Array<{
    id: string;
    code?: string;
    title: BilingualText;
    description?: BilingualText;
    images: string[];
    order: number;
  }>;
}

export interface PublicServiceDetail {
  id: string;
  code?: string;
  title: BilingualText;
  description?: BilingualText;
  images: string[];
  order: number;
  companies: PublicServiceCompany[];
  jobs: PublicServiceJob[];
}

export interface PublicServiceProject {
  _id: string;
  yearGroup: string;
  title: BilingualText;
  executingEntity?: string;
  client: string;
  period: string;
  order: number;
  published: boolean;
  createdAt: string;
  updatedAt: string;
  updatedBy?: string;
}

export type PublicServiceProjectInput = Omit<
  PublicServiceProject,
  "_id" | "createdAt" | "updatedAt" | "updatedBy"
>;
export type PublicServiceProjectUpdateInput =
  Partial<PublicServiceProjectInput>;

export interface PublicServiceProjectPageItem {
  id: string;
  yearGroup: string;
  title: BilingualText;
  executingEntity?: string;
  client: string;
  period: string;
  order: number;
}

export interface PublicServiceProjectFacets {
  yearGroups: string[];
  clients: string[];
}

export interface PublicServiceProjectListResponse {
  success: boolean;
  data: PublicServiceProjectPageItem[];
  total: number;
  page: number;
  limit: number;
  facets: PublicServiceProjectFacets;
}

export interface HomepageVideo {
  _id: string;
  youtubeUrl: string;
  youtubeVideoId: string;
  title?: string | null;
  thumbnailUrl?: string | null;
  isFeatured: boolean;
  order: number;
  published: boolean;
  createdAt: string;
  updatedAt: string;
  updatedBy?: string | null;
}

export type HomepageVideoInput = Omit<
  HomepageVideo,
  "_id" | "createdAt" | "updatedAt" | "updatedBy" | "youtubeVideoId"
>;
export type HomepageVideoUpdateInput = Partial<
  Omit<HomepageVideoInput, "youtubeUrl"> & { youtubeUrl: string }
>;

export interface PublicHomepageVideo {
  id: string;
  youtubeUrl: string;
  youtubeVideoId: string;
  title?: string | null;
  thumbnailUrl: string;
  isFeatured: boolean;
  order: number;
}
