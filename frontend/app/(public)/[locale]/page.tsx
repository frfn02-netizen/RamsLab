import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import PublicHome from "@/components/public/home";
import { localizedMetadata } from "@/lib/i18n/metadata";
import { getHomePageData } from "@/lib/public/server-data";
import type { Locale } from "@/i18n/routing";

export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;

  const t = await getTranslations({
    locale,
    namespace: "home",
  });

  return localizedMetadata({
    locale: locale as Locale,
    title: t("headline"),
    description: t("description"),
    path: "/",
  });
}

export default async function HomePage() {
  const data = await getHomePageData();

  return <PublicHome {...data} />;
}
