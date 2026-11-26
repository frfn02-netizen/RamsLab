import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import PublicVideosPage from "@/components/public/public-videos-page";
import { getPublicHomepageVideos } from "@/lib/api/modules";
import { localizedMetadata } from "@/lib/i18n/metadata";
import type { Locale } from "@/i18n/routing";
import type { PublicHomepageVideo } from "@/types/modules";

export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "videos" });

  return localizedMetadata({
    locale: locale as Locale,
    title: t("metaTitle"),
    description: t("description"),
    path: "/videos",
  });
}

export default async function VideosRoutePage() {
  let videos: PublicHomepageVideo[] = [];

  try {
    videos = await getPublicHomepageVideos({
      next: { revalidate: 300 },
    });
  } catch {
    videos = [];
  }

  return <PublicVideosPage initialVideos={videos} />;
}
