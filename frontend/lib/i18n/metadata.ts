import type { Metadata } from "next";
import type { Locale } from "@/i18n/routing";

export function localizedMetadata({
  locale,
  title,
  description,
  path,
}: {
  locale: Locale;
  title: string;
  description: string;
  path: string;
}): Metadata {
  const englishPath = path === "/" ? "/" : path;
  const indonesianPath = path === "/" ? "/id" : `/id${path}`;
  const canonical = locale === "id" ? indonesianPath : englishPath;
  return {
    title,
    description,
    alternates: {
      canonical,
      languages: { en: englishPath, id: indonesianPath },
    },
    openGraph: {
      title,
      description,
      locale,
      alternateLocale: locale === "en" ? ["id"] : ["en"],
      type: "website",
    },
  };
}
