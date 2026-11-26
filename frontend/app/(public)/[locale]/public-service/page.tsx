import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import PublicServicePage from "@/components/public/public-service/public-service-page";
import {
  getPublicPartners,
  getPublicServiceProjectsList,
} from "@/lib/api/modules";
import { localizedMetadata } from "@/lib/i18n/metadata";
import type {
  Partner,
  PublicServiceProjectListResponse,
} from "@/types/modules";
import type { Locale } from "@/i18n/routing";

export const revalidate = 300;

const EMPTY_PROJECTS: PublicServiceProjectListResponse = {
  success: false,
  data: [],
  total: 0,
  page: 1,
  limit: 10,
  facets: { yearGroups: [], clients: [] },
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "publicService" });

  return localizedMetadata({
    locale: locale as Locale,
    title: t("metaTitle"),
    description: t("description"),
    path: "/public-service",
  });
}

export default async function PublicServiceRoutePage() {
  const [industrialPartners, initialProjects] = await Promise.all([
    getPublicPartners("INDUSTRIAL", { next: { revalidate: 300 } }).catch(
      () => [] as Partner[],
    ),
    getPublicServiceProjectsList(
      { page: 1, limit: 10, sort: "newest" },
      { next: { revalidate: 300 } },
    ).catch(() => EMPTY_PROJECTS),
  ]);

  return (
    <PublicServicePage
      initialIndustrialPartners={industrialPartners}
      initialProjects={initialProjects}
    />
  );
}
