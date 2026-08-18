import { apiRequest, apiRequestWithMeta } from "./client";
import type { Dosen, DosenInput, DosenUpdateInput, Partner, PartnerInput, PartnerType, PartnerUpdateInput, Project, ProjectInput, ProjectUpdateInput, AlumniTracking, TrackingInput, TrackingUpdateInput, PublicResearchArea, ResearchArea, ResearchAreaInput, ResearchAreaUpdateInput } from "@/types/modules";
import type { ManagedAccount } from "@/types/auth";
import type { SiteContentAdminEnvelope, SiteContentKey, SiteContentMap } from "@/types/site-content";

export const getDosenList = () => apiRequest<Dosen[]>("/dosen");
export const getDosenById = (id: string) => apiRequest<Dosen>(`/dosen/${encodeURIComponent(id)}`);
export const createDosen = (input: DosenInput) => apiRequest<Dosen>("/dosen", { method: "POST", body: JSON.stringify(input) });
export const updateDosen = (id: string, input: DosenUpdateInput) => apiRequest<Dosen>(`/dosen/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(input) });
export const uploadDosenPhoto = (id: string, file: File) => apiRequest<Dosen>(`/dosen/${encodeURIComponent(id)}/photo`, { method: "POST", body: file, headers: { "Content-Type": file.type }, timeoutMs: 30000 });
export const deleteDosen = async (id: string) => { await apiRequestWithMeta(`/dosen/${encodeURIComponent(id)}`, { method: "DELETE" }); };
export const createDosenAccount = (input: { email: string; password: string }) => apiRequest<ManagedAccount>("/users/dosen", { method: "POST", body: JSON.stringify(input) });

export const getProjects = (params?: { category?: string; year?: number; published?: boolean }) => {
  const query = new URLSearchParams();
  if (params?.category) query.set("category", params.category);
  if (params?.year) query.set("year", String(params.year));
  if (params?.published !== undefined) query.set("published", String(params.published));
  return apiRequest<Project[]>(`/projects${query.size ? `?${query}` : ""}`);
};
export const getProjectById = (id: string) => apiRequest<Project>(`/projects/${encodeURIComponent(id)}`);
export const getProjectBySlug = (slug: string) => apiRequest<Project>(`/projects/slug/${encodeURIComponent(slug)}`);
export const createProject = (input: ProjectInput) => apiRequest<Project>("/projects", { method: "POST", body: JSON.stringify(input) });
export const updateProject = (id: string, input: ProjectUpdateInput) => apiRequest<Project>(`/projects/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(input) });
export const deleteProject = async (id: string) => { await apiRequestWithMeta(`/projects/${encodeURIComponent(id)}`, { method: "DELETE" }); };

export const getPartners = (type: PartnerType) => apiRequest<Partner[]>(`/partners/${type.toLowerCase()}`);
export const getPartnerById = (type: PartnerType, id: string) => apiRequest<Partner>(`/partners/${type.toLowerCase()}/${encodeURIComponent(id)}`);
export const createPartner = (type: PartnerType, input: PartnerInput) => apiRequest<Partner>(`/partners/${type.toLowerCase()}`, { method: "POST", body: JSON.stringify(input) });
export const updatePartner = (type: PartnerType, id: string, input: PartnerUpdateInput) => apiRequest<Partner>(`/partners/${type.toLowerCase()}/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(input) });
export const deletePartner = async (type: PartnerType, id: string) => { await apiRequestWithMeta(`/partners/${type.toLowerCase()}/${encodeURIComponent(id)}`, { method: "DELETE" }); };

export const getResearchAreas = () => apiRequest<ResearchArea[]>("/admin/research");
export const getResearchAreaById = (id: string) => apiRequest<ResearchArea>(`/admin/research/${encodeURIComponent(id)}`);
export const createResearchArea = (input: ResearchAreaInput) => apiRequest<ResearchArea>("/admin/research", { method: "POST", body: JSON.stringify(input) });
export const updateResearchArea = (id: string, input: ResearchAreaUpdateInput) => apiRequest<ResearchArea>(`/admin/research/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(input) });
export const deleteResearchArea = async (id: string) => { await apiRequestWithMeta(`/admin/research/${encodeURIComponent(id)}`, { method: "DELETE" }); };

export const getPublicProjects = () => apiRequest<Project[]>("/public/projects");
export const getPublicProject = (slug: string) => apiRequest<Project>(`/public/projects/${encodeURIComponent(slug)}`);
export const getPublicPartners = (type: PartnerType) => apiRequest<Partner[]>(`/public/partners/${type.toLowerCase()}`);
export const getPublicResearch = () => apiRequest<PublicResearchArea[]>("/public/research");

export const getPublicSiteContent = <K extends SiteContentKey>(key: K) => apiRequest<SiteContentMap[K]>(`/public/site-content/${encodeURIComponent(key)}`);
export const getAdminSiteContentList = () => apiRequest<SiteContentAdminEnvelope[]>("/admin/site-content");
export const getAdminSiteContent = <K extends SiteContentKey>(key: K) => apiRequest<SiteContentAdminEnvelope<K>>(`/admin/site-content/${encodeURIComponent(key)}`);
export const updateAdminSiteContent = <K extends SiteContentKey>(key: K, content: SiteContentMap[K]) => apiRequest<SiteContentAdminEnvelope<K>>(`/admin/site-content/${encodeURIComponent(key)}`, { method: "PUT", body: JSON.stringify({ content }) });

export const getTrackingByAlumniId = (alumniId: string) => apiRequest<AlumniTracking[]>(`/tracking/alumni/${encodeURIComponent(alumniId)}`);
export const getTrackingById = (id: string) => apiRequest<AlumniTracking>(`/tracking/${encodeURIComponent(id)}`);
export const createTracking = (alumniId: string, input: TrackingInput) => apiRequest<AlumniTracking>(`/tracking/alumni/${encodeURIComponent(alumniId)}`, { method: "POST", body: JSON.stringify(input) });
export const updateTracking = (id: string, input: TrackingUpdateInput) => apiRequest<AlumniTracking>(`/tracking/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(input) });
export const deleteTracking = async (id: string) => { await apiRequestWithMeta(`/tracking/${encodeURIComponent(id)}`, { method: "DELETE" }); };
