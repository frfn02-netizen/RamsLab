import { apiRequest, apiRequestWithMeta, apiUrl } from "./client";
import type {
  Dosen,
  DosenInput,
  DosenUpdateInput,
  Partner,
  PartnerInput,
  PartnerType,
  PartnerUpdateInput,
  Project,
  ProjectInput,
  ProjectUpdateInput,
  Publication,
  PublicationInput,
  PublicationUpdateInput,
  AlumniTracking,
  TrackingInput,
  TrackingUpdateInput,
  PublicResearchArea,
  ResearchArea,
  ResearchAreaInput,
  ResearchAreaUpdateInput,
  ResearchHighlight,
  ResearchHighlightInput,
  CmsEvent,
  CmsEventInput,
  CmsEventUpdateInput,
  PublicEvent,
  PublicServiceDetail,
  PublicServiceExpert,
  PublicServiceExpertInput,
  PublicServiceExpertUpdateInput,
  PublicServiceInput,
  PublicServicePageData,
  PublicServiceRecord,
  PublicServiceUpdateInput,
  Student,
  StudentInput,
  StudentUpdateInput,
  Expert,
  ExpertInput,
  ExpertUpdateInput,
} from "@/types/modules";
import type { ManagedAccount } from "@/types/auth";
import type {
  SiteContentAdminEnvelope,
  SiteContentKey,
  SiteContentMap,
} from "@/types/site-content";
import type {
  PublicAlumniResponse,
  PublicPeopleResponse,
  PublicPerson,
} from "@/types/people";

export const getDosenList = () => apiRequest<Dosen[]>("/dosen");
export const getPublicDosenList = () =>
  apiRequest<PublicPerson[]>("/public/dosen");
export const getPublicPeopleList = () =>
  apiRequest<PublicPeopleResponse>("/public/people");
export const getPublicDosenById = (id: string) =>
  apiRequest<PublicPerson>(`/public/people/${encodeURIComponent(id)}`);
export const getPublicAlumniList = () =>
  apiRequest<PublicAlumniResponse>("/public/alumni");
export const getDosenById = (id: string) =>
  apiRequest<Dosen>(`/dosen/${encodeURIComponent(id)}`);
export const createDosen = (input: DosenInput) =>
  apiRequest<Dosen>("/dosen", { method: "POST", body: JSON.stringify(input) });
export const updateDosen = (id: string, input: DosenUpdateInput) =>
  apiRequest<Dosen>(`/dosen/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
export const uploadDosenPhoto = (id: string, file: File) =>
  apiRequest<Dosen>(`/dosen/${encodeURIComponent(id)}/photo`, {
    method: "POST",
    body: file,
    headers: { "Content-Type": file.type },
    timeoutMs: 30000,
  });
export const deleteDosen = async (id: string) => {
  await apiRequestWithMeta(`/dosen/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
};
export const createDosenAccount = (input: {
  email: string;
  password: string;
}) =>
  apiRequest<ManagedAccount>("/users/dosen", {
    method: "POST",
    body: JSON.stringify(input),
  });
export const getStudentList = () => apiRequest<Student[]>("/students");
export const getStudentById = (id: string) =>
  apiRequest<Student>(`/students/${encodeURIComponent(id)}`);
export const createStudent = (input: StudentInput) =>
  apiRequest<Student>("/students", {
    method: "POST",
    body: JSON.stringify(input),
  });
export const updateStudent = (id: string, input: StudentUpdateInput) =>
  apiRequest<Student>(`/students/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
export const uploadStudentPhoto = (id: string, file: File) =>
  apiRequest<Student>(`/students/${encodeURIComponent(id)}/photo`, {
    method: "POST",
    body: file,
    headers: { "Content-Type": file.type },
    timeoutMs: 30000,
  });
export const deleteStudent = async (id: string) => {
  await apiRequestWithMeta(`/students/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
};

export const getProjects = (params?: {
  category?: string;
  year?: number;
  published?: boolean;
}) => {
  const query = new URLSearchParams();
  if (params?.category) query.set("category", params.category);
  if (params?.year) query.set("year", String(params.year));
  if (params?.published !== undefined)
    query.set("published", String(params.published));
  return apiRequest<Project[]>(`/projects${query.size ? `?${query}` : ""}`);
};
export const getProjectById = (id: string) =>
  apiRequest<Project>(`/projects/${encodeURIComponent(id)}`);
export const getProjectBySlug = (slug: string) =>
  apiRequest<Project>(`/projects/slug/${encodeURIComponent(slug)}`);
export const createProject = (input: ProjectInput) =>
  apiRequest<Project>("/projects", {
    method: "POST",
    body: JSON.stringify(input),
  });
export const updateProject = (id: string, input: ProjectUpdateInput) =>
  apiRequest<Project>(`/projects/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
export const deleteProject = async (id: string) => {
  await apiRequestWithMeta(`/projects/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
};

export const uploadProjectImage = (file: File) =>
  apiRequest<{ url: string; publicId?: string }>(
    `/projects/image?filename=${encodeURIComponent(file.name)}`,
    {
      method: "POST",
      body: file,
      headers: { "Content-Type": file.type },
      timeoutMs: 30000,
    },
  );

export type PublicationQuery = {
  search?: string;
  year?: number;
  topic?: string[];
  method?: string[];
  sort?: "newest" | "oldest";
  page?: number;
  limit?: number;
};
export const getPublications = (params: PublicationQuery = {}) => {
  const query = new URLSearchParams();
  if (params.search) query.set("search", params.search);
  if (params.year) query.set("year", String(params.year));
  params.topic?.forEach((value) => query.append("topic", value));
  params.method?.forEach((value) => query.append("method", value));
  if (params.sort) query.set("sort", params.sort);
  if (params.page) query.set("page", String(params.page));
  if (params.limit) query.set("limit", String(params.limit));
  return apiRequest<Publication[]>(
    `/publications${query.size ? `?${query}` : ""}`,
  );
};
export const getPublication = (id: string) =>
  apiRequest<Publication>(`/publications/${encodeURIComponent(id)}`);
export const createPublication = (input: PublicationInput) =>
  apiRequest<Publication>("/publications", {
    method: "POST",
    body: JSON.stringify(input),
  });
export const updatePublication = (id: string, input: PublicationUpdateInput) =>
  apiRequest<Publication>(`/publications/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
export const uploadPublicationPdf = (id: string, file: File) =>
  apiRequest<Publication>(`/publications/${encodeURIComponent(id)}/pdf`, {
    method: "POST",
    body: file,
    headers: {
      "Content-Type": file.type,
      "X-Original-Filename": file.name,
    },
    timeoutMs: 30000,
  });
export const uploadTemporaryPublicationPdf = (file: File) =>
  apiRequest<{ url: string; publicId: string; filename: string }>(
    "/publications/pdf-upload",
    {
      method: "POST",
      body: file,
      headers: {
        "Content-Type": file.type,
        "X-Original-Filename": file.name,
      },
      timeoutMs: 30000,
    },
  );
export const getPublicPublicationPdfUrl = (id: string) =>
  apiUrl(`/publications/${encodeURIComponent(id)}/pdf`);
export const deletePublication = async (id: string) => {
  await apiRequestWithMeta(`/publications/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
};

export const getResearchHighlights = () =>
  apiRequest<ResearchHighlight[]>("/admin/research-highlights");
export const getResearchHighlight = (id: string) =>
  apiRequest<ResearchHighlight>(
    `/admin/research-highlights/${encodeURIComponent(id)}`,
  );
export const createResearchHighlight = (input: ResearchHighlightInput) =>
  apiRequest<ResearchHighlight>("/admin/research-highlights", {
    method: "POST",
    body: JSON.stringify(input),
  });
export const updateResearchHighlight = (
  id: string,
  input: Partial<ResearchHighlightInput>,
) =>
  apiRequest<ResearchHighlight>(
    `/admin/research-highlights/${encodeURIComponent(id)}`,
    { method: "PATCH", body: JSON.stringify(input) },
  );
export const deleteResearchHighlight = async (id: string) => {
  await apiRequestWithMeta(
    `/admin/research-highlights/${encodeURIComponent(id)}`,
    { method: "DELETE" },
  );
};
export const uploadResearchHighlightImage = (id: string, file: File) =>
  apiRequest<ResearchHighlight>(
    `/admin/research-highlights/${encodeURIComponent(id)}/image`,
    {
      method: "POST",
      body: file,
      headers: { "Content-Type": file.type },
      timeoutMs: 30000,
    },
  );
export const removeResearchHighlightImage = (id: string) =>
  apiRequest<ResearchHighlight>(
    `/admin/research-highlights/${encodeURIComponent(id)}/image`,
    { method: "DELETE" },
  );

export const getEvents = () => apiRequest<CmsEvent[]>("/admin/events");
export const getEvent = (id: string) =>
  apiRequest<CmsEvent>(`/admin/events/${encodeURIComponent(id)}`);
export const createEvent = (input: CmsEventInput) =>
  apiRequest<CmsEvent>("/admin/events", {
    method: "POST",
    body: JSON.stringify(input),
  });
export const updateEvent = (id: string, input: CmsEventUpdateInput) =>
  apiRequest<CmsEvent>(`/admin/events/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
export const uploadEventImage = (
  id: string,
  file: File,
  alt?: { en?: string; id?: string },
) => {
  const query = new URLSearchParams();
  if (alt?.en) query.set("altEn", alt.en);
  if (alt?.id) query.set("altId", alt.id);
  return apiRequest<CmsEvent>(
    `/admin/events/${encodeURIComponent(id)}/image${
      query.size ? `?${query}` : ""
    }`,
    {
      method: "POST",
      body: file,
      headers: { "Content-Type": file.type },
      timeoutMs: 30000,
    },
  );
};
export const deleteEvent = async (id: string) => {
  await apiRequestWithMeta(`/admin/events/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
};

export const getPublicServiceExperts = () =>
  apiRequest<PublicServiceExpert[]>("/admin/public-service/experts");
export const getPublicServiceExpert = (id: string) =>
  apiRequest<PublicServiceExpert>(
    `/admin/public-service/experts/${encodeURIComponent(id)}`,
  );
export const createPublicServiceExpert = (input: PublicServiceExpertInput) =>
  apiRequest<PublicServiceExpert>("/admin/public-service/experts", {
    method: "POST",
    body: JSON.stringify(input),
  });
export const updatePublicServiceExpert = (
  id: string,
  input: PublicServiceExpertUpdateInput,
) =>
  apiRequest<PublicServiceExpert>(
    `/admin/public-service/experts/${encodeURIComponent(id)}`,
    { method: "PATCH", body: JSON.stringify(input) },
  );
export const deletePublicServiceExpert = async (id: string) => {
  await apiRequestWithMeta(
    `/admin/public-service/experts/${encodeURIComponent(id)}`,
    { method: "DELETE" },
  );
};

export const getPublicServices = () =>
  apiRequest<PublicServiceRecord[]>("/admin/public-service/services");
export const getPublicService = (id: string) =>
  apiRequest<PublicServiceRecord>(
    `/admin/public-service/services/${encodeURIComponent(id)}`,
  );
export const createPublicService = (input: PublicServiceInput) =>
  apiRequest<PublicServiceRecord>("/admin/public-service/services", {
    method: "POST",
    body: JSON.stringify(input),
  });
export const updatePublicService = (
  id: string,
  input: PublicServiceUpdateInput,
) =>
  apiRequest<PublicServiceRecord>(
    `/admin/public-service/services/${encodeURIComponent(id)}`,
    { method: "PATCH", body: JSON.stringify(input) },
  );
export const deletePublicService = async (id: string) => {
  await apiRequestWithMeta(
    `/admin/public-service/services/${encodeURIComponent(id)}`,
    { method: "DELETE" },
  );
};
export const uploadPublicServiceImage = (id: string, file: File) =>
  apiRequest<{ url: string; publicId?: string }>(
    `/admin/public-service/services/${encodeURIComponent(id)}/image?filename=${encodeURIComponent(file.name)}`,
    {
      method: "POST",
      body: file,
      headers: { "Content-Type": file.type },
      timeoutMs: 30000,
    },
  );

export const getPartners = (type: PartnerType) =>
  apiRequest<Partner[]>(`/partners/${type.toLowerCase()}`);
export const getPartnerById = (type: PartnerType, id: string) =>
  apiRequest<Partner>(
    `/partners/${type.toLowerCase()}/${encodeURIComponent(id)}`,
  );
export const createPartner = (type: PartnerType, input: PartnerInput) =>
  apiRequest<Partner>(`/partners/${type.toLowerCase()}`, {
    method: "POST",
    body: JSON.stringify(input),
  });
export const updatePartner = (
  type: PartnerType,
  id: string,
  input: PartnerUpdateInput,
) =>
  apiRequest<Partner>(
    `/partners/${type.toLowerCase()}/${encodeURIComponent(id)}`,
    { method: "PATCH", body: JSON.stringify(input) },
  );
export const deletePartner = async (type: PartnerType, id: string) => {
  await apiRequestWithMeta(
    `/partners/${type.toLowerCase()}/${encodeURIComponent(id)}`,
    { method: "DELETE" },
  );
};

export const uploadPartnerLogo = (id: string, file: File) =>
  apiRequest<Partner>(`/partners/${encodeURIComponent(id)}/logo`, {
    method: "POST",
    body: file,
    headers: { "Content-Type": file.type },
    timeoutMs: 30000,
  });

export const getExpertList = () => apiRequest<Expert[]>("/experts");
export const getExpertById = (id: string) =>
  apiRequest<Expert>(`/experts/${encodeURIComponent(id)}`);
export const createExpert = (input: ExpertInput) =>
  apiRequest<Expert>("/experts", {
    method: "POST",
    body: JSON.stringify(input),
  });
export const updateExpert = (id: string, input: ExpertUpdateInput) =>
  apiRequest<Expert>(`/experts/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
export const deleteExpert = async (id: string) => {
  await apiRequestWithMeta(`/experts/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
};
export const uploadExpertPhoto = (id: string, file: File) =>
  apiRequest<Expert>(`/experts/${encodeURIComponent(id)}/photo`, {
    method: "POST",
    body: file,
    headers: { "Content-Type": file.type },
    timeoutMs: 30000,
  });

export const getResearchAreas = () =>
  apiRequest<ResearchArea[]>("/admin/research");
export const getResearchAreaById = (id: string) =>
  apiRequest<ResearchArea>(`/admin/research/${encodeURIComponent(id)}`);
export const createResearchArea = (input: ResearchAreaInput) =>
  apiRequest<ResearchArea>("/admin/research", {
    method: "POST",
    body: JSON.stringify(input),
  });
export const updateResearchArea = (
  id: string,
  input: ResearchAreaUpdateInput,
) =>
  apiRequest<ResearchArea>(`/admin/research/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
export const uploadResearchAreaPng = (id: string, file: File) =>
  apiRequest<{ url: string; publicId?: string }>(
    `/admin/research/${encodeURIComponent(id)}/png?filename=${encodeURIComponent(file.name)}`,
    {
      method: "POST",
      body: file,
      headers: { "Content-Type": file.type },
      timeoutMs: 30000,
    },
  );
export const deleteResearchArea = async (id: string) => {
  await apiRequestWithMeta(`/admin/research/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
};

export const getPublicProjects = (options?: {
  featured?: boolean;
  limit?: number;
}) =>
  apiRequest<Project[]>(
    `/public/projects${
      options
        ? `?${new URLSearchParams({
            ...(options.featured !== undefined
              ? { featured: String(options.featured) }
              : {}),
            ...(options.limit !== undefined
              ? { limit: String(options.limit) }
              : {}),
          })}`
        : ""
    }`,
  );
export const getPublicProject = (slug: string) =>
  apiRequest<Project>(`/public/projects/${encodeURIComponent(slug)}`);
export const getPublicPartners = (type: PartnerType) =>
  apiRequest<Partner[]>(`/public/partners/${type.toLowerCase()}`);
export const getPublicHomepagePartners = () =>
  apiRequest<Partner[]>("/public/partners/homepage");
export const getPublicExperts = () =>
  apiRequest<Expert[]>("/public/experts");
export const getPublicExpertById = (id: string) =>
  apiRequest<Expert>(`/public/experts/${encodeURIComponent(id)}`);
export const getPublicResearch = () =>
  apiRequest<PublicResearchArea[]>("/public/research");
export const getPublicResearchArea = (slug: string) =>
  apiRequest<PublicResearchArea>(
    `/public/research/${encodeURIComponent(slug)}`,
  );
export const getPublicResearchHighlights = () =>
  apiRequest<ResearchHighlight[]>("/public/research-highlights");
export const getPublicEvents = () =>
  apiRequest<PublicEvent[]>("/public/events");
export const getPublicServicePage = () =>
  apiRequest<PublicServicePageData>("/public/public-services");
export const getPublicServiceDetail = (id: string) =>
  apiRequest<PublicServiceDetail>(
    `/public/public-services/${encodeURIComponent(id)}`,
  );

export const getPublicSiteContent = <K extends SiteContentKey>(key: K) =>
  apiRequest<SiteContentMap[K]>(
    `/public/site-content/${encodeURIComponent(key)}`,
  );
export const getAdminSiteContentList = () =>
  apiRequest<SiteContentAdminEnvelope[]>("/admin/site-content");
export const getAdminSiteContent = <K extends SiteContentKey>(key: K) =>
  apiRequest<SiteContentAdminEnvelope<K>>(
    `/admin/site-content/${encodeURIComponent(key)}`,
  );
export const updateAdminSiteContent = <K extends SiteContentKey>(
  key: K,
  content: SiteContentMap[K],
) =>
  apiRequest<SiteContentAdminEnvelope<K>>(
    `/admin/site-content/${encodeURIComponent(key)}`,
    { method: "PUT", body: JSON.stringify({ content }) },
  );

export const uploadHomepageImage = (file: File) =>
  apiRequest<{ url: string; publicId?: string }>(
    `/admin/site-content/homepage/image?filename=${encodeURIComponent(file.name)}`,
    {
      method: "POST",
      body: file,
      headers: { "Content-Type": file.type },
      timeoutMs: 30000,
    },
  );

export const getTrackingByAlumniId = (alumniId: string) =>
  apiRequest<AlumniTracking[]>(
    `/tracking/alumni/${encodeURIComponent(alumniId)}`,
  );
export const getTrackingById = (id: string) =>
  apiRequest<AlumniTracking>(`/tracking/${encodeURIComponent(id)}`);
export const createTracking = (alumniId: string, input: TrackingInput) =>
  apiRequest<AlumniTracking>(
    `/tracking/alumni/${encodeURIComponent(alumniId)}`,
    { method: "POST", body: JSON.stringify(input) },
  );
export const updateTracking = (id: string, input: TrackingUpdateInput) =>
  apiRequest<AlumniTracking>(`/tracking/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
export const deleteTracking = async (id: string) => {
  await apiRequestWithMeta(`/tracking/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
};
