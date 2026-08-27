export interface DashboardStats {
  users: number;
  alumni: number;
  dosen: number;
  projects: number;
  publications: number;
  universityPartners: number;
  industrialPartners: number;
  researchAreas: number;
  publishedResearchAreas: number;
  unpublishedResearchAreas: number;
  latestSiteContentUpdatedAt: string | null;
  latestSiteContentKey: "homepage" | "about" | "contact" | "footer" | null;
}
