"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import PublicContainer from "./public-container";
import RevealOnScroll from "./reveal-on-scroll";

export default function HomeMaritimeCta() {
  const t = useTranslations("home");

  return (
    <section className="maritime-cta maritime-cta-horizon bg-[var(--navy)] text-white">
      {/* Grid overlay */}
      <div
        className="maritime-cta-grid pointer-events-none absolute inset-0"
        aria-hidden="true"
      />

      {/* Subtle wave lines at top */}
      <svg
        className="pointer-events-none absolute left-0 top-0 w-full opacity-[0.06]"
        viewBox="0 0 1440 80"
        preserveAspectRatio="none"
        style={{ height: "80px" }}
        aria-hidden="true"
      >
        <path
          d="M0,40 Q360,10 720,40 Q1080,70 1440,40"
          stroke="white"
          strokeWidth="1"
          fill="none"
        />
        <path
          d="M0,50 Q360,20 720,50 Q1080,80 1440,50"
          stroke="white"
          strokeWidth="0.75"
          fill="none"
        />
        <path
          d="M0,60 Q360,30 720,60 Q1080,90 1440,60"
          stroke="white"
          strokeWidth="0.5"
          fill="none"
        />
      </svg>

      {/* Compass rose — top right */}
      <svg
        className="pointer-events-none absolute right-[5%] top-[15%] opacity-[0.04] sm:right-[8%] sm:top-[20%]"
        width="120"
        height="120"
        viewBox="0 0 120 120"
        fill="none"
        aria-hidden="true"
      >
        <circle cx="60" cy="60" r="55" stroke="white" strokeWidth="0.75" />
        <circle cx="60" cy="60" r="40" stroke="white" strokeWidth="0.5" />
        <line
          x1="60"
          y1="2"
          x2="60"
          y2="118"
          stroke="white"
          strokeWidth="0.5"
        />
        <line
          x1="2"
          y1="60"
          x2="118"
          y2="60"
          stroke="white"
          strokeWidth="0.5"
        />
        <line
          x1="18"
          y1="18"
          x2="102"
          y2="102"
          stroke="white"
          strokeWidth="0.35"
        />
        <line
          x1="102"
          y1="18"
          x2="18"
          y2="102"
          stroke="white"
          strokeWidth="0.35"
        />
        <polygon points="60,8 64,52 60,48 56,52" fill="white" opacity="0.6" />
        <text
          x="60"
          y="6"
          textAnchor="middle"
          fill="white"
          fontSize="7"
          opacity="0.5"
        >
          N
        </text>
      </svg>

      {/* Content */}
      <PublicContainer className="relative z-10 py-20 sm:py-24 lg:py-28">
        <RevealOnScroll className="text-center">
          <p className="eyebrow text-[var(--rams-red)]">
            {t("ctaTitle").split("?")[0].includes("reliability")
              ? "COLLABORATE WITH US"
              : t("ctaTitle").split("?")[0]}
          </p>

          <h2 className="mx-auto mt-5 max-w-3xl whitespace-pre-line font-display text-3xl font-bold leading-tight tracking-tight sm:text-4xl lg:text-5xl">
            {t("ctaTitle")}
          </h2>

          <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-white/70 sm:text-lg">
            {t("ctaDescription")}
          </p>

          <Link
            href="/contact"
            className="mt-10 inline-block rounded bg-[var(--rams-red)] px-8 py-3.5 text-sm font-semibold tracking-wide text-white shadow-lg shadow-[var(--rams-red)]/20 transition hover:bg-[var(--rams-red-dark)] hover:shadow-xl hover:shadow-[var(--rams-red)]/30"
          >
            Discuss a collaboration →
          </Link>
        </RevealOnScroll>
      </PublicContainer>

      {/* Bottom wave lines */}
      <svg
        className="pointer-events-none absolute bottom-0 left-0 w-full opacity-[0.05]"
        viewBox="0 0 1440 60"
        preserveAspectRatio="none"
        style={{ height: "60px" }}
        aria-hidden="true"
      >
        <path
          d="M0,20 Q360,50 720,20 Q1080,-10 1440,20"
          stroke="white"
          strokeWidth="1"
          fill="none"
        />
        <path
          d="M0,30 Q360,60 720,30 Q1080,0 1440,30"
          stroke="white"
          strokeWidth="0.75"
          fill="none"
        />
      </svg>
    </section>
  );
}
