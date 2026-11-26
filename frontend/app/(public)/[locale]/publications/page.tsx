import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import Publications from "@/components/public/publications";
import {
  getPublications,
  type PublicationListResponse,
} from "@/lib/api/modules";
import { localizedMetadata } from "@/lib/i18n/metadata";
import type { Locale } from "@/i18n/routing";

export const revalidate = 300;

const EMPTY_PUBLICATIONS: PublicationListResponse = {
  success: false,
  data: [],
  total: 0,
  page: 1,
  limit: 0,
  facets: { years: [], topics: [], methods: [] },
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({
    locale,
    namespace: "publications",
  });

  return localizedMetadata({
    locale,
    title: t("heroTitle"),
    description: t("heroDescription"),
    path: "/publications",
  });
}

export default async function PublicationsPage() {
  let initialData = EMPTY_PUBLICATIONS;

  try {
    initialData = await getPublications({}, { next: { revalidate: 300 } });
  } catch {
    initialData = EMPTY_PUBLICATIONS;
  }

  return <Publications initialData={initialData} initialQuery="" />;
}
