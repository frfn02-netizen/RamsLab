import { getLocale, getTranslations } from "next-intl/server";

import type { PublicHomepageVideo } from "@/types/modules";
import { extractYouTubeId } from "@/lib/youtube";
import VideoCarousel, { type CmsVideoItem } from "./video-carousel";

export interface VideoCarouselSectionProps {
  videos: PublicHomepageVideo[];
}

type PublicVideoWithPublishState = PublicHomepageVideo & {
  published?: boolean;
};

export default async function HomeVideoSection({
  videos,
}: VideoCarouselSectionProps) {
  const locale = await getLocale();
  const t = await getTranslations({ locale, namespace: "home.video" });

  const items: CmsVideoItem[] = (videos as PublicVideoWithPublishState[])
    .filter((video) => video.published !== false)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((video) => ({
      id: video.id,
      youtubeUrl: video.youtubeUrl,
      title: video.title,
      thumbnailUrl: video.thumbnailUrl,
      displayOrder: video.order ?? 0,
      featured: video.isFeatured,
      published: true,
    }))
    .filter((video) => extractYouTubeId(video.youtubeUrl) !== null);

  if (items.length === 0) return null;

  return (
    <section className="relative overflow-hidden border-y border-slate-200/80 bg-[#F8FAFC] py-12 sm:py-16 lg:py-20">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:24px_24px] opacity-45"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(217,45,32,0.05),transparent_65%)]"
      />

      <div className="relative mx-auto max-w-7xl px-6">
        <div className="flex flex-col gap-4 md:grid md:grid-cols-[minmax(0,1fr)_minmax(16rem,24rem)] md:items-end md:gap-10">
          <div>
            <h2 className="mt-3 font-display text-3xl font-bold text-slate-900 md:text-4xl">
              {t("title")}
            </h2>
          </div>
          <p className="max-w-md text-sm leading-6 text-slate-600 md:justify-self-end">
            {t("description")}
          </p>
        </div>
      </div>

      <div className="relative mt-8">
        <VideoCarousel videos={items} />
      </div>
    </section>
  );
}
