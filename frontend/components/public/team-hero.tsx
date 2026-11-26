import { useTranslations } from "next-intl";
import PublicContainer from "./public-container";

export default function TeamHero() {
  const t = useTranslations("team");

  return (
    <section
      id="hero"
      data-hero-tone="light"
      className="team-page relative overflow-hidden bg-stone-50"
    >
      <PublicContainer>
        <div className="grid grid-cols-1 gap-6 py-8 lg:grid-cols-12 lg:items-end lg:gap-10 lg:py-10">
          <div className="hero-entrance min-w-0 lg:col-span-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-400">
              {t("heroEyebrow")}
            </p>

            <h1 className="mt-2 text-3xl font-bold leading-[1.12] tracking-tight text-stone-900 sm:text-4xl">
              {t("heroTitle")}
            </h1>
          </div>

          <div className="min-w-0 lg:col-span-6">
            <p className="max-w-xl text-sm leading-relaxed text-stone-600 sm:text-base lg:ml-auto">
              {t("heroDescription")}
            </p>
          </div>
        </div>
      </PublicContainer>
    </section>
  );
}
