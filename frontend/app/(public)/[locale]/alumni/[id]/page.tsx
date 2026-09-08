import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import AlumniProfile from "@/components/public/alumni-profile";
import { localizedMetadata } from "@/lib/i18n/metadata";
import type { Locale } from "@/i18n/routing";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "alumni" });

  return localizedMetadata({
    locale: locale as Locale,
    title: t("heroTitle"),
    description: t("heroDescription"),
    path: "/alumni",
  });
}

export default async function AlumniDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AlumniProfile id={id} />;
}
