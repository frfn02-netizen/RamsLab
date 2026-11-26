import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import CtaSection from "@/components/public/cta-section";
import TeamDirectory from "@/components/public/team-directory";
import TeamHero from "@/components/public/team-hero";
import { getPublicPeopleList } from "@/lib/api/modules";
import { localizedMetadata } from "@/lib/i18n/metadata";
import type { PublicPeopleResponse } from "@/types/people";
import type { Locale } from "@/i18n/routing";

export const revalidate = 300;

const EMPTY_PEOPLE: PublicPeopleResponse = {
  DOSEN: [],
  MAHASISWA: [],
  MASTER: [],
  UNDERGRADUATE: [],
  INTERNSHIP: [],
  ALUMNI: [],
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({
    locale,
    namespace: "team",
  });

  return localizedMetadata({
    locale: locale as Locale,
    title: t("heroTitle"),
    description: t("heroDescription"),
    path: "/team",
  });
}

export default async function TeamPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = rawLocale === "id" ? "id" : "en";
  const [t, common, people] = await Promise.all([
    getTranslations({ locale, namespace: "team" }),
    getTranslations({ locale, namespace: "common" }),
    getPublicPeopleList({ next: { revalidate: 300 } }).catch(
      () => EMPTY_PEOPLE,
    ),
  ]);

  return (
    <>
      <TeamHero />

      <TeamDirectory initialPeople={people} />

      <CtaSection
        eyebrow={common("nextConversation")}
        title={t("ctaTitle")}
        description={t("ctaDescription")}
        primary={t("ctaPrimary")}
        primaryHref="/contact"
      />
    </>
  );
}
