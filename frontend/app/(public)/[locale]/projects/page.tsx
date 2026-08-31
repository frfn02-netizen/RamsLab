import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import PublicProjects from "@/components/public/projects";
import type { Locale } from "@/i18n/routing";
import { localizedMetadata } from "@/lib/i18n/metadata";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;

  const t = await getTranslations({
    locale,
    namespace: "projects",
  });

  return localizedMetadata({
    locale: locale as Locale,
    title: t("heroTitle"),
    description: t("heroDescription"),
    path: "/projects",
  });
}

export default function PublicProjectsPage() {
  return <PublicProjects />;
}
