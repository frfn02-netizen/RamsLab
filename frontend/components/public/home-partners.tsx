import { getLocale, getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import type { Partner } from "@/types/modules";
import PublicContainer from "./public-container";
import RevealOnScroll from "./reveal-on-scroll";
import { MarqueeRow } from "./partner-marquee";

export default async function HomePartnersSection({
  partners,
}: {
  partners: Partner[];
}) {
  const locale = await getLocale();
  const t = await getTranslations({ locale, namespace: "home" });
  const university = partners.filter(
    (partner) => partner.type === "UNIVERSITY",
  );
  const mid = Math.ceil(university.length / 2);
  const row1 = university.slice(0, mid);
  const row2 = university.slice(mid);

  return (
    <section className="relative overflow-hidden bg-[var(--background-light)]">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(var(--navy) 1px, transparent 1px), linear-gradient(90deg, var(--navy) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
        aria-hidden="true"
      />

      <div className="relative z-10 pt-10 sm:pt-14">
        <PublicContainer>
          <RevealOnScroll className="text-center">
            <p className="mx-auto mt-3 max-w-2xl text-base text-[var(--gray)] sm:text-lg">
              {t("partners.description")}
            </p>
          </RevealOnScroll>
        </PublicContainer>

        {university.length > 0 ? (
          <RevealOnScroll className="mt-8">
            <p className="mb-5 text-center text-xl font-bold uppercase tracking-widest text-[var(--gray)]">
              {t("partners.universityTitle")}
            </p>
            <div className="space-y-10">
              {row1.length > 0 && (
                <MarqueeRow
                  partners={row1}
                  direction="right"
                  ariaLabel={t("partners.universityTitle")}
                />
              )}
              {row2.length > 0 && (
                <MarqueeRow
                  partners={row2}
                  direction="left"
                  ariaLabel={t("partners.universityTitle")}
                />
              )}
            </div>
          </RevealOnScroll>
        ) : (
          <RevealOnScroll className="mx-auto mt-8 max-w-2xl border border-dashed border-[var(--border)] bg-white/70 p-8 text-center">
            <p className="text-sm leading-6 text-[var(--gray)]">
              {t("partnersEmpty")}
            </p>
          </RevealOnScroll>
        )}

        <RevealOnScroll className="relative z-10 mt-10 pb-4 sm:mt-12">
          <div className="partners-cta-decor flex items-center justify-center">
            <svg
              className="mr-3 hidden h-2 w-2 text-[var(--rams-red)] sm:block"
              viewBox="0 0 8 8"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M4 0L8 4L4 8L0 4Z" />
            </svg>

            <Link
              href="/partners"
              className="text-sm font-semibold tracking-wide text-[var(--navy)] transition hover:text-[var(--rams-red)]"
            >
              {t("partners.viewAll")} →
            </Link>

            <svg
              className="ml-3 hidden h-2 w-2 text-[var(--rams-red)] sm:block"
              viewBox="0 0 8 8"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M4 0L8 4L4 8L0 4Z" />
            </svg>
          </div>

          <svg
            className="mx-auto mt-6 opacity-[0.12]"
            width="200"
            height="12"
            viewBox="0 0 200 12"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M0 6 Q50 0 100 6 Q150 12 200 6"
              stroke="var(--navy)"
              strokeWidth="0.75"
              fill="none"
            />
            <path
              d="M0 9 Q50 3 100 9 Q150 15 200 9"
              stroke="var(--navy)"
              strokeWidth="0.5"
              fill="none"
            />
          </svg>
        </RevealOnScroll>
      </div>

      <div className="relative z-10" aria-hidden="true">
        <svg
          className="block w-full"
          viewBox="0 0 1440 60"
          preserveAspectRatio="none"
          style={{ height: "clamp(30px, 4vw, 60px)" }}
        >
          <path
            d="M0,30 C240,55 480,5 720,30 C960,55 1200,5 1440,30 L1440,60 L0,60 Z"
            fill="var(--navy)"
          />
        </svg>
      </div>
    </section>
  );
}
