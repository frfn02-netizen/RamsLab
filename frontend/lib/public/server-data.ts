import type {
  Partner,
  PublicHomepageVideo,
  PublicResearchArea,
  ResearchHighlight,
} from "@/types/modules";
import type { PublicPeopleResponse, PublicPerson } from "@/types/people";
import type { FooterContent, HomepageContent } from "@/types/site-content";
import {
  getPublicHomepagePartners,
  getPublicHomepageVideos,
  getPublicPeopleList,
  getPublicResearch,
  getPublicResearchHighlights,
  getPublicSiteContent,
} from "@/lib/api/modules";
import { buildPeoplePool } from "./people";

export const PUBLIC_DATA_REVALIDATE = 300;

const PUBLIC_FETCH_OPTIONS = {
  next: { revalidate: PUBLIC_DATA_REVALIDATE },
} as const;

const EMPTY_PEOPLE: PublicPeopleResponse = {
  DOSEN: [],
  MAHASISWA: [],
  MASTER: [],
  UNDERGRADUATE: [],
  INTERNSHIP: [],
  ALUMNI: [],
};

async function safe<T>(load: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await load();
  } catch {
    return fallback;
  }
}

export type HomePageData = {
  content: HomepageContent | null;
  researchAreas: PublicResearchArea[];
  researchHighlights: ResearchHighlight[];
  videos: PublicHomepageVideo[];
  partners: Partner[];
  people: PublicPerson[];
};

export async function getHomePageData(): Promise<HomePageData> {
  const [content, researchAreas, researchHighlights, videos, partners, people] =
    await Promise.all([
      safe(() => getPublicSiteContent("homepage", PUBLIC_FETCH_OPTIONS), null),
      safe(() => getPublicResearch(PUBLIC_FETCH_OPTIONS), []),
      safe(() => getPublicResearchHighlights(PUBLIC_FETCH_OPTIONS), []),
      safe(() => getPublicHomepageVideos(PUBLIC_FETCH_OPTIONS), []),
      safe(() => getPublicHomepagePartners(PUBLIC_FETCH_OPTIONS), []),
      safe(() => getPublicPeopleList(PUBLIC_FETCH_OPTIONS), EMPTY_PEOPLE),
    ]);

  return {
    content,
    researchAreas,
    researchHighlights,
    videos,
    partners,
    people: buildPeoplePool(people),
  };
}

export async function getPublicFooterContent(): Promise<FooterContent | null> {
  return safe(() => getPublicSiteContent("footer", PUBLIC_FETCH_OPTIONS), null);
}
