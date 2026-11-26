import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import PublicEventsPage from "@/components/public/events/public-events-page";
import { getPublicEvents } from "@/lib/api/modules";
import { localizedMetadata } from "@/lib/i18n/metadata";
import type { Locale } from "@/i18n/routing";
import type { PublicEvent } from "@/types/modules";

export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "events" });

  return localizedMetadata({
    locale: locale as Locale,
    title: t("metaTitle"),
    description: t("description"),
    path: "/events",
  });
}

export default async function EventsRoutePage() {
  let events: PublicEvent[] = [];

  try {
    events = await getPublicEvents({ next: { revalidate: 300 } });
  } catch {
    events = [];
  }

  return <PublicEventsPage initialEvents={events} />;
}
