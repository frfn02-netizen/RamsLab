"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { getPublicHomepagePartners } from "@/lib/api/modules";
import type { Partner } from "@/types/modules";
import PublicContainer from "./public-container";
import RevealOnScroll from "./reveal-on-scroll";

export default function HomePartnersSection() {
  const t = useTranslations("home");
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPublicHomepagePartners()
      .then(setPartners)
      .catch(() => setPartners([]))
      .finally(() => setLoading(false));
  }, []);

  const industrial = useMemo(
    () => partners.filter((p) => p.type === "INDUSTRIAL"),
    [partners],
  );
  const university = useMemo(
    () => partners.filter((p) => p.type === "UNIVERSITY"),
    [partners],
  );

  if (loading || partners.length === 0) return null;

  return (
    <section className="relative overflow-hidden bg-[var(--background-light)]">
      {/* Faint maritime grid pattern */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(var(--navy) 1px, transparent 1px), linear-gradient(90deg, var(--navy) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
        aria-hidden="true"
      />

      <div className="relative z-10 pt-16 sm:pt-20">
        <PublicContainer>
          <RevealOnScroll className="text-center">
            <p className="eyebrow text-[var(--rams-red)]">
              {t("partners.sectionEyebrow")}
            </p>
            <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-[var(--navy)] sm:text-4xl">
              {t("partners.title")}
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base text-[var(--gray)] sm:text-lg">
              {t("partners.description")}
            </p>
          </RevealOnScroll>
        </PublicContainer>

        {/* Industrial Partners — RIGHT → LEFT */}
        {industrial.length > 0 && (
          <RevealOnScroll className="mt-12">
            <p className="mb-5 text-center text-xl font-bold uppercase tracking-widest text-[var(--gray)]">
              {t("partners.industrialTitle")}
            </p>
            <MarqueeRow
              partners={industrial}
              direction="left"
              ariaLabel={t("partners.industrialTitle")}
            />
          </RevealOnScroll>
        )}

        {/* University Partners — LEFT → RIGHT */}
        {university.length > 0 && (
          <RevealOnScroll className="mt-10">
            <p className="mb-5 text-center text-xl font-bold uppercase tracking-widest text-[var(--gray)]">
              {t("partners.universityTitle")}
            </p>
            <MarqueeRow
              partners={university}
              direction="right"
              ariaLabel={t("partners.universityTitle")}
            />
          </RevealOnScroll>
        )}

        {/* View all partners CTA with decorative maritime lines */}
        <RevealOnScroll className="relative z-10 mt-14 pb-4 sm:mt-16">
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

      {/* Wave transition to next section */}
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

/* ========================================
   MARQUEE ROW
   ======================================== */

function MarqueeRow({
  partners,
  direction,
  ariaLabel,
}: {
  partners: Partner[];
  direction: "left" | "right";
  ariaLabel: string;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const firstSetRef = useRef<HTMLDivElement>(null);
  const [distance, setDistance] = useState(0);

  // Measure the width of ONE set of items (first half of the duplicated list)
  const measure = useCallback(() => {
    if (!firstSetRef.current) return;
    const firstSetWidth = firstSetRef.current.offsetWidth;
    if (firstSetWidth > 0) {
      setDistance(firstSetWidth);
    }
  }, []);

  useEffect(() => {
    measure();

    const ro = new ResizeObserver(measure);
    if (firstSetRef.current) {
      ro.observe(firstSetRef.current);
    }

    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [measure, partners]);

  // Duration scales with distance so visual speed stays consistent
  const duration = distance > 0 ? Math.max(25, distance / 12) : 30;

  const trackStyle =
    distance > 0
      ? ({
          "--marquee-distance": `${distance}px`,
          "--marquee-duration": `${duration}s`,
          animationDuration: `${duration}s`,
        } as React.CSSProperties)
      : undefined;

  // Split items: first half for measurement, full list for animation
  const half = partners.length;

  return (
    <div
      className="partner-marquee-row group relative"
      role="region"
      aria-label={ariaLabel}
    >
      {/* Fade edges */}
      <div
        className="pointer-events-none absolute left-0 top-0 z-10 h-full w-16 sm:w-24"
        style={{
          background:
            "linear-gradient(to right, var(--background-light), transparent)",
        }}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute right-0 top-0 z-10 h-full w-16 sm:w-24"
        style={{
          background:
            "linear-gradient(to left, var(--background-light), transparent)",
        }}
        aria-hidden="true"
      />

      <div className="overflow-hidden">
        {/* Hidden measurement container — first set only */}
        <div
          ref={firstSetRef}
          className="pointer-events-none absolute top-0 flex w-max opacity-0"
          aria-hidden="true"
        >
          {partners.map((partner) => (
            <MarqueeItem key={`measure-${partner._id}`} partner={partner} />
          ))}
        </div>

        {/* Visible animated track — duplicated for seamless loop */}
        <div
          ref={trackRef}
          className={`partner-marquee-track partner-marquee-track--${direction}`}
          style={trackStyle}
        >
          {[...partners, ...partners].map((partner, index) => (
            <MarqueeItem key={`${partner._id}-${index}`} partner={partner} />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ========================================
   MARQUEE ITEM
   ======================================== */

function MarqueeItem({ partner }: { partner: Partner }) {
  const label = partner.website
    ? `${partner.name} — ${partner.website}`
    : partner.name;

  const inner = partner.logo ? (
    <div className="flex flex-col items-center gap-3">
      <Image
        src={partner.logo}
        alt={partner.name}
        width={200}
        height={80}
        unoptimized
        className="h-16 w-auto object-contain sm:h-20 md:h-24 lg:h-28 xl:h-32"
      />
      <span className="hidden text-[0.7rem] font-medium tracking-wide text-[var(--gray)] sm:inline">
        {partner.name}
      </span>
    </div>
  ) : (
    <div className="flex flex-col items-center gap-3">
      <div className="flex h-16 w-36 items-center justify-center rounded border border-[var(--border)] bg-white px-4 text-[0.7rem] font-bold leading-tight text-[var(--navy)] sm:h-20 sm:w-40 md:h-24 md:w-48 lg:h-28 lg:w-56 xl:h-32 xl:w-64">
        {partner.name}
      </div>
      <span className="hidden text-[0.7rem] font-medium tracking-wide text-[var(--gray)] sm:inline">
        {partner.name}
      </span>
    </div>
  );

  const sharedClass =
    "flex-shrink-0 px-7 sm:px-9 md:px-11 lg:px-14 xl:px-16 flex items-center justify-center transition duration-300 hover:scale-105";

  if (partner.website) {
    return (
      <a
        href={partner.website}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={label}
        className={sharedClass}
      >
        {inner}
      </a>
    );
  }

  return (
    <div className={sharedClass} aria-label={partner.name}>
      {inner}
    </div>
  );
}
