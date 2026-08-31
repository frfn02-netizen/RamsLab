import { countAlumni } from "../alumni/alumni.repository.js";
import { countDosen } from "../dosen/dosen.repository.js";
import { countProjects } from "../projects/project.repository.js";
import { countUsers } from "../users/user.repository.js";
import { countPartners } from "../partners/partner.repository.js";
import { countPublications } from "../publications/publication.repository.js";
import { PARTNER_TYPE } from "../partners/partner.types.js";
import { countResearchAreas } from "../research/research.repository.js";
import { findLatestSiteContent } from "../site-content/site-content.repository.js";

export async function getDashboardStats() {
  const [
    users,
    alumni,
    dosen,
    projects,
    publications,
    universityPartners,
    industrialPartners,
    researchAreas,
    publishedResearchAreas,
    latestSiteContent,
  ] = await Promise.all([
    countUsers(),
    countAlumni(),
    countDosen(),
    countProjects(),
    countPublications(),
    countPartners(PARTNER_TYPE.UNIVERSITY),
    countPartners(PARTNER_TYPE.INDUSTRIAL),
    countResearchAreas(),
    countResearchAreas({ publishedOnly: true }),
    findLatestSiteContent(),
  ]);

  return {
    users,
    alumni,
    dosen,
    projects,
    publications,
    universityPartners,
    industrialPartners,
    researchAreas,
    publishedResearchAreas,
    unpublishedResearchAreas: researchAreas - publishedResearchAreas,
    latestSiteContentUpdatedAt: latestSiteContent?.updatedAt ?? null,
    latestSiteContentKey: latestSiteContent?.key ?? null,
  };
}
