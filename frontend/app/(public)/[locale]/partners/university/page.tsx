import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import PublicPartners from "@/components/public/partners";
import { getPublicPartners } from "@/lib/api/modules";
import { localizedMetadata } from "@/lib/i18n/metadata";
import type { Partner } from "@/types/modules";
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
    namespace: "partners",
  });

  return localizedMetadata({
    locale: locale as Locale,
    title: t("universityTitle"),
    description: t("universityDescription"),
    path: "/partners/university",
  });
}

export default async function UniversityPartnersPage() {
  let partners: Partner[] = [];

  try {
    partners = await getPublicPartners("UNIVERSITY", {
      next: { revalidate: 300 },
    });
  } catch {
    partners = [];
  }

  return <PublicPartners type="UNIVERSITY" initialPartners={partners} />;
}
