import Image from "next/image";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { HomepageContent } from "@/types/site-content";
import PublicContainer from "./public-container";
import RevealOnScroll from "./reveal-on-scroll";

export default async function HomeIntroduction() {
  const locale = await getLocale();
  const t = await getTranslations({ locale, namespace: "home" });

  return (
    <section
      className="flex items-center bg-white py-14 sm:py-16 lg:py-20 min-[2000px]:py-28"
      aria-labelledby="welcome-title"
    >
      <PublicContainer className="w-full">
        <RevealOnScroll className="mx-auto text-center">
          <p className="text-sm font-bold uppercase leading-snug tracking-normal text-black sm:text-base lg:text-lg">
            {(() => {
              const eyebrow = t("welcome.eyebrow");
              const splitIndex = eyebrow.indexOf("RAMS");
              if (splitIndex === -1) return eyebrow;
              return (
                <>
                  <span className="font-normal">
                    {eyebrow.slice(0, splitIndex)}
                  </span>
                  <span>{eyebrow.slice(splitIndex)}</span>
                </>
              );
            })()}
          </p>
          <h2
            id="welcome-title"
            className="public-section-title mx-auto mt-3 max-w-[74rem] text-[var(--rams-red)]"
          >
            {t("welcome.title")}
          </h2>
          <p className="public-lead mx-auto mt-5 max-w-[70ch] text-black">
            {t("welcome.description")}
          </p>
          <Link
            href="/about"
            className="mt-8 inline-block bg-[var(--rams-red)] px-8 py-3 text-sm font-semibold text-white transition hover:bg-[var(--rams-red-dark)]"
          >
            Learn More About Us
          </Link>
        </RevealOnScroll>
      </PublicContainer>
    </section>
  );
}

export async function HeadOfLaboratorySection({
  content,
}: {
  content: HomepageContent;
}) {
  const locale = (await getLocale()) === "id" ? "id" : "en";
  const t = await getTranslations({ locale, namespace: "home" });
  const localized = (value: { en: string; id: string }) => value[locale];
  const head = content.headOfLaboratory;

  if (!head) {
    return null;
  }

  return (
    <section
      className="border-y border-[var(--border)] bg-[var(--background-light)] py-14 sm:py-16 lg:py-20 min-[2000px]:py-28"
      aria-labelledby="head-of-laboratory-title"
    >
      <PublicContainer>
        <RevealOnScroll className="grid gap-8 lg:grid-cols-[minmax(18rem,0.8fr)_minmax(0,1.2fr)] lg:items-center lg:gap-12">
          <div className="relative aspect-[4/5] w-full max-w-md overflow-hidden border border-[var(--border)] bg-[var(--navy)] shadow-[0_18px_45px_rgba(8,24,38,0.08)] lg:max-w-none">
            {head.image?.url ? (
              <Image
                src={head.image.url}
                alt={localized(head.image.alt ?? head.imageAlt)}
                fill
                sizes="(min-width: 1024px) 34vw, (min-width: 640px) 28rem, 100vw"
                className="object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center p-8 text-center">
                <span
                  className="font-display text-7xl font-bold text-white/15"
                  aria-hidden="true"
                >
                  RAMS
                </span>
                <span className="sr-only">{t("head.noImage")}</span>
              </div>
            )}
          </div>
          <div className="max-w-4xl">
            <p className="eyebrow text-[var(--rams-red)]">
              {localized(head.eyebrow)}
            </p>
            <p className="mt-4 text-base font-semibold leading-7 text-[var(--navy)] sm:text-lg">
              {localized(head.role)}
            </p>
            <h2
              id="head-of-laboratory-title"
              className="public-section-title mt-2 text-[var(--navy)]"
            >
              {head.name}
            </h2>
            <div className="mt-6 h-px w-24 bg-[var(--rams-red)]" />
            <p className="mt-6 whitespace-pre-line text-base leading-8 text-[var(--charcoal)] sm:text-lg sm:leading-9">
              {localized(head.greeting)}
            </p>
          </div>
        </RevealOnScroll>
      </PublicContainer>
    </section>
  );
}
