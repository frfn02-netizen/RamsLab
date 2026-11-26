import { getLocale, getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import type { ResearchHighlight } from "@/types/modules";
import PublicContainer from "./public-container";
import ResearchHighlightsCarousel from "./research-highlights-carousel";

export default async function ResearchHighlights({
  items,
}: {
  items: ResearchHighlight[];
}) {
  if (items.length > 0) {
    return <ResearchHighlightsCarousel items={items} />;
  }

  const locale = await getLocale();
  const t = await getTranslations({ locale, namespace: "home" });

  return (
    <section
      id="hero"
      data-hero-tone="dark"
      aria-label={t("researchHighlights.carouselLabel")}
      className="relative -mt-[4.5rem] flex h-[100svh] max-h-[68rem] min-h-[34rem] items-center overflow-hidden bg-[#2a0a0e] py-20 text-white"
    >
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(160deg, #2a0a0e 0%, #3d1018 30%, #2a0a0e 70%, #1a0810 100%)",
        }}
        aria-hidden="true"
      />
      <PublicContainer className="relative z-10 pt-16">
        <div className="max-w-3xl">
          <div className="flex items-center gap-3">
            <span className="inline-block h-px w-8 bg-[var(--rams-red)]" />
            <p className="eyebrow !text-[var(--rams-red-on-dark)]">
              {t("researchHighlights.eyebrow")}
            </p>
          </div>
          <h1 className="public-hero-title mt-4 text-white">{t("headline")}</h1>
          <p className="public-lead mt-6 max-w-2xl text-white/80">
            {t("description")}
          </p>
          <Link
            href="/research"
            className="public-meta mt-8 inline-flex items-center gap-2 border-b-2 border-[var(--rams-red)] pb-1 font-bold text-white transition-colors hover:border-white"
          >
            {t("research.linkLabel")}
          </Link>
        </div>
      </PublicContainer>
    </section>
  );
}
