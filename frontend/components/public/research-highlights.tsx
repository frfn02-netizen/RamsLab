"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  getPublicPublicationPdfUrl,
  getPublicResearchHighlights,
} from "@/lib/api/modules";
import type { ResearchHighlight } from "@/types/modules";
import PublicContainer from "./public-container";
import { PublicError, PublicLoading } from "./public-states";

const AUTOPLAY_MS = 6500;

function Arrow({ direction }: { direction: "previous" | "next" }) {
  return <span aria-hidden="true">{direction === "previous" ? "" : ""}</span>;
}

function buildMaritimeChartSvg(): string {
  const ticks = Array.from({ length: 36 }, (_, i) => {
    const angle = (i * 10 * Math.PI) / 180;
    const x1 = Math.sin(angle) * 86;
    const y1 = -Math.cos(angle) * 86;
    const x2 = Math.sin(angle) * 90;
    const y2 = -Math.cos(angle) * 90;
    const sw = i % 9 === 0 ? "0.75" : "0.35";
    return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="white" stroke-width="${sw}"/>`;
  }).join("");

  return `<svg class="absolute inset-0 h-full w-full" viewBox="0 0 1400 900" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" preserveAspectRatio="xMidYMid slice">
    <g opacity="0.10" transform="translate(1120, 170)">
      <circle r="90" stroke="white" stroke-width="1"/>
      <circle r="70" stroke="white" stroke-width="0.75"/>
      <circle r="50" stroke="white" stroke-width="0.5"/>
      <circle r="30" stroke="white" stroke-width="0.5"/>
      <line x1="0" y1="-100" x2="0" y2="100" stroke="white" stroke-width="0.75"/>
      <line x1="-100" y1="0" x2="100" y2="0" stroke="white" stroke-width="0.75"/>
      <line x1="-71" y1="-71" x2="71" y2="71" stroke="white" stroke-width="0.5"/>
      <line x1="71" y1="-71" x2="-71" y2="71" stroke="white" stroke-width="0.5"/>
      <polygon points="0,-95 5,-75 -5,-75" fill="white" opacity="0.6"/>
      <polygon points="0,95 5,75 -5,75" fill="white" opacity="0.3"/>
      <polygon points="-95,0 -75,5 -75,-5" fill="white" opacity="0.3"/>
      <polygon points="95,0 75,5 75,-5" fill="white" opacity="0.3"/>
      <text x="0" y="-105" text-anchor="middle" fill="white" font-size="9" font-weight="700" letter-spacing="0.12em">N</text>
      <text x="0" y="114" text-anchor="middle" fill="white" font-size="8" opacity="0.5">S</text>
      <text x="108" y="4" text-anchor="start" fill="white" font-size="8" opacity="0.5">E</text>
      <text x="-108" y="4" text-anchor="end" fill="white" font-size="8" opacity="0.5">W</text>
      ${ticks}
    </g>

    <g opacity="0.06">
      <line x1="0" y1="120" x2="1400" y2="120" stroke="white" stroke-width="0.5" stroke-dasharray="6 10"/>
      <line x1="0" y1="240" x2="1400" y2="240" stroke="white" stroke-width="0.5" stroke-dasharray="6 10"/>
      <line x1="0" y1="360" x2="1400" y2="360" stroke="white" stroke-width="0.5" stroke-dasharray="6 10"/>
      <line x1="0" y1="480" x2="1400" y2="480" stroke="white" stroke-width="0.5" stroke-dasharray="6 10"/>
      <line x1="0" y1="600" x2="1400" y2="600" stroke="white" stroke-width="0.5" stroke-dasharray="6 10"/>
      <line x1="0" y1="720" x2="1400" y2="720" stroke="white" stroke-width="0.5" stroke-dasharray="6 10"/>
      <line x1="0" y1="840" x2="1400" y2="840" stroke="white" stroke-width="0.5" stroke-dasharray="6 10"/>
    </g>

    <g opacity="0.05">
      <line x1="200" y1="0" x2="200" y2="900" stroke="white" stroke-width="0.5" stroke-dasharray="6 10"/>
      <line x1="400" y1="0" x2="400" y2="900" stroke="white" stroke-width="0.5" stroke-dasharray="6 10"/>
      <line x1="600" y1="0" x2="600" y2="900" stroke="white" stroke-width="0.5" stroke-dasharray="6 10"/>
      <line x1="800" y1="0" x2="800" y2="900" stroke="white" stroke-width="0.5" stroke-dasharray="6 10"/>
      <line x1="1000" y1="0" x2="1000" y2="900" stroke="white" stroke-width="0.5" stroke-dasharray="6 10"/>
      <line x1="1200" y1="0" x2="1200" y2="900" stroke="white" stroke-width="0.5" stroke-dasharray="6 10"/>
    </g>

    <g opacity="0.09">
      <path d="M-50 350 Q120 280 300 320 T600 300 T900 340 T1200 310" stroke="white" stroke-width="1.2"/>
      <path d="M-50 380 Q120 310 300 350 T600 330 T900 370 T1200 340" stroke="white" stroke-width="0.8"/>
      <path d="M-50 410 Q120 340 300 380 T600 360 T900 400 T1200 370" stroke="white" stroke-width="0.6"/>
    </g>
    <g opacity="0.06">
      <path d="M200 650 Q400 600 600 630 T1000 610 T1400 640" stroke="white" stroke-width="0.8"/>
      <path d="M200 680 Q400 630 600 660 T1000 640 T1400 670" stroke="white" stroke-width="0.6"/>
    </g>

    <g opacity="0.06" transform="translate(1080, 480)">
      <path d="M-140 0 Q-100 -8 -60 -18 L0 -22 L60 -18 Q100 -8 140 0 L100 12 L0 18 L-100 12 Z" stroke="white" stroke-width="1" fill="none"/>
      <line x1="0" y1="-22" x2="0" y2="-95" stroke="white" stroke-width="1"/>
      <line x1="-50" y1="-18" x2="-50" y2="-65" stroke="white" stroke-width="0.75"/>
      <line x1="50" y1="-18" x2="50" y2="-65" stroke="white" stroke-width="0.75"/>
      <line x1="0" y1="-95" x2="35" y2="-75" stroke="white" stroke-width="0.5"/>
      <line x1="0" y1="-95" x2="-35" y2="-75" stroke="white" stroke-width="0.5"/>
    </g>

    <g opacity="0.05" transform="translate(900, 300)">
      <circle r="120" stroke="white" stroke-width="0.75" stroke-dasharray="4 8"/>
      <circle r="80" stroke="white" stroke-width="0.5" stroke-dasharray="4 8"/>
      <circle r="40" stroke="white" stroke-width="0.5" stroke-dasharray="4 8"/>
      <line x1="0" y1="-130" x2="0" y2="130" stroke="white" stroke-width="0.4"/>
      <line x1="-130" y1="0" x2="130" y2="0" stroke="white" stroke-width="0.4"/>
      <line x1="-92" y1="-92" x2="92" y2="92" stroke="white" stroke-width="0.3"/>
      <line x1="92" y1="-92" x2="-92" y2="92" stroke="white" stroke-width="0.3"/>
    </g>

    <g opacity="0.06" fill="white" font-size="8" font-family="monospace">
      <text x="205" y="115">05\u00B0S</text>
      <text x="405" y="235">10\u00B0S</text>
      <text x="605" y="355">15\u00B0S</text>
      <text x="805" y="475">20\u00B0S</text>
      <text x="205" y="715">30\u00B0S</text>
      <text x="605" y="835">35\u00B0S</text>
    </g>

    <g opacity="0.08">
      <path d="M0 760 Q100 735 200 760 T400 760 T600 760 T800 760" stroke="white" stroke-width="1"/>
      <path d="M0 785 Q100 760 200 785 T400 785 T600 785 T800 785" stroke="white" stroke-width="0.75"/>
      <path d="M0 810 Q100 785 200 810 T400 810 T600 810 T800 810" stroke="white" stroke-width="0.6"/>
      <path d="M0 835 Q100 810 200 835 T400 835 T600 835 T800 835" stroke="white" stroke-width="0.4"/>
    </g>

    <g opacity="0.06">
      <circle cx="350" cy="300" r="18" stroke="white" stroke-width="0.6"/>
      <line x1="350" y1="277" x2="350" y2="323" stroke="white" stroke-width="0.5"/>
      <line x1="327" y1="300" x2="373" y2="300" stroke="white" stroke-width="0.5"/>
      <circle cx="700" cy="200" r="12" stroke="white" stroke-width="0.5"/>
      <line x1="700" y1="183" x2="700" y2="217" stroke="white" stroke-width="0.4"/>
      <line x1="683" y1="200" x2="717" y2="200" stroke="white" stroke-width="0.4"/>
      <circle cx="500" cy="600" r="14" stroke="white" stroke-width="0.5"/>
      <line x1="500" y1="581" x2="500" y2="619" stroke="white" stroke-width="0.4"/>
      <line x1="481" y1="600" x2="519" y2="600" stroke="white" stroke-width="0.4"/>
    </g>

    <g opacity="0.04" transform="translate(1250, 350)">
      <rect x="-25" y="-40" width="50" height="40" stroke="white" stroke-width="0.75" fill="none"/>
      <line x1="-25" y1="0" x2="-40" y2="60" stroke="white" stroke-width="0.75"/>
      <line x1="25" y1="0" x2="40" y2="60" stroke="white" stroke-width="0.75"/>
      <line x1="-40" y1="60" x2="40" y2="60" stroke="white" stroke-width="0.5"/>
      <line x1="0" y1="-40" x2="0" y2="-70" stroke="white" stroke-width="0.75"/>
      <line x1="-15" y1="-70" x2="15" y2="-70" stroke="white" stroke-width="0.5"/>
    </g>

    <g opacity="0.04">
      <path d="M100 200 Q300 250 500 180 T900 220 T1300 160" stroke="white" stroke-width="1" stroke-dasharray="12 8"/>
      <circle cx="100" cy="200" r="4" fill="white" opacity="0.5"/>
      <circle cx="500" cy="180" r="4" fill="white" opacity="0.5"/>
      <circle cx="900" cy="220" r="4" fill="white" opacity="0.5"/>
      <circle cx="1300" cy="160" r="4" fill="white" opacity="0.5"/>
    </g>
  </svg>`;
}

function MaritimeChartPattern() {
  const [svgHtml, setSvgHtml] = useState("");

  useEffect(() => {
    setSvgHtml(buildMaritimeChartSvg());
  }, []);

  return (
    <div
      className="absolute inset-0"
      dangerouslySetInnerHTML={{ __html: svgHtml }}
      aria-hidden="true"
    />
  );
}

export default function ResearchHighlights() {
  const locale = useLocale() === "id" ? "id" : "en";
  const t = useTranslations("home");
  const [items, setItems] = useState<ResearchHighlight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const pauseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      getPublicResearchHighlights()
        .then(setItems)
        .catch(() => setError(true))
        .finally(() => setLoading(false));
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    return () => {
      if (pauseTimer.current) clearTimeout(pauseTimer.current);
    };
  }, []);

  useEffect(() => {
    if (items.length < 2 || paused || reducedMotion) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        setActive((current) => (current + 1) % items.length);
      }
    }, AUTOPLAY_MS);
    return () => window.clearInterval(timer);
  }, [items.length, paused, reducedMotion]);

  function interact(next: number) {
    setActive((next + items.length) % items.length);
    setPaused(true);
    if (pauseTimer.current) clearTimeout(pauseTimer.current);
    pauseTimer.current = setTimeout(() => setPaused(false), AUTOPLAY_MS * 2);
  }

  if (loading) {
    return (
      <section className="relative -mt-[4.5rem] h-[100svh] overflow-hidden bg-[#2a0a0e] py-20 text-white">
        <MaritimeChartPattern />
        <PublicContainer className="relative z-10">
          <PublicLoading label={t("researchHighlights.loading")} />
        </PublicContainer>
      </section>
    );
  }
  if (error) {
    return (
      <section className="relative -mt-[4.5rem] h-[100svh] overflow-hidden bg-[#2a0a0e] py-20 text-white">
        <MaritimeChartPattern />
        <PublicContainer className="relative z-10">
          <PublicError message={t("researchHighlights.error")} />
        </PublicContainer>
      </section>
    );
  }
  if (!items.length) return null;

  const item = items[active] ?? items[0];
  const headline = item.headline[locale];
  const publication = item.publication;
  const imageAlt = `${t("researchHighlights.imageAlt")} \u2014 ${headline}`;

  return (
    <section
      id="hero"
      className="relative -mt-[4.5rem] h-[100svh] overflow-hidden bg-[#2a0a0e] text-white"
      aria-label={t("researchHighlights.carouselLabel")}
    >
      {/* Base layer — maritime photography */}
      <div className="absolute inset-0">
        {item.image?.url ? (
          <Image
            src={item.image.url}
            alt={imageAlt}
            fill
            sizes="100vw"
            unoptimized
            className="object-cover"
          />
        ) : (
          <div
            className="flex h-full items-center justify-center bg-[linear-gradient(160deg,#2a0a0e_0%,#3d1018_30%,#2a0a0e_70%,#1a0810_100%)]"
            aria-hidden="true"
          >
            <span className="font-display text-7xl font-bold tracking-tight text-white/[0.06] sm:text-[10rem]">
              RAMS
            </span>
          </div>
        )}
      </div>

      {/* Primary maroon overlay — strongest on left, fades toward right */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(90deg, rgba(42,10,14,0.97) 0%, rgba(42,10,14,0.93) 20%, rgba(42,10,14,0.82) 40%, rgba(42,10,14,0.55) 65%, rgba(42,10,14,0.28) 85%, rgba(42,10,14,0.12) 100%)",
        }}
        aria-hidden="true"
      />

      {/* Navy depth layer — subtle secondary, bottom and right areas */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(145deg, transparent 0%, transparent 40%, rgba(11,32,56,0.25) 70%, rgba(11,32,56,0.4) 100%)",
        }}
        aria-hidden="true"
      />

      {/* Bottom depth — maroon-to-navy transition */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(0deg, rgba(26,8,16,0.8) 0%, rgba(42,10,14,0.4) 25%, transparent 50%)",
        }}
        aria-hidden="true"
      />

      {/* Maritime chart pattern */}
      <MaritimeChartPattern />

      {/* Content */}
      <PublicContainer className="relative z-10 flex h-full flex-col py-8 sm:py-12 lg:py-16">
        <div className="flex flex-1 flex-col justify-center">
          <div
            key={item.id}
            className="research-highlight-enter max-w-3xl lg:max-w-[55%]"
            aria-live="polite"
            aria-roledescription="slide"
            aria-label={`${active + 1} / ${items.length}`}
          >
            <div className="flex items-center gap-3">
              <span className="inline-block h-px w-8 bg-[var(--rams-red)]" />
              <p className="eyebrow !text-[var(--rams-red)]">
                {t("researchHighlights.question")}
              </p>
            </div>
            <h2 className="mt-6 font-display text-4xl font-bold leading-[1.04] tracking-[-0.04em] text-white sm:text-5xl lg:text-6xl">
              {headline}
            </h2>
            <div className="mt-8 max-w-2xl border-t border-white/20 pt-6">
              <p className="text-base font-semibold leading-7 text-white/95">
                {publication.title}
              </p>
              <p className="mt-2.5 text-sm leading-6 text-white/60">
                {publication.authors.join(", ")} \u00B7 {publication.year}
                {publication.journal ? ` \u00B7 ${publication.journal}` : ""}
              </p>
            </div>
            {publication.pdfUrl ? (
              <a
                href={getPublicPublicationPdfUrl(publication.id)}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-10 inline-flex items-center gap-2 border-b-2 border-[var(--rams-red)] pb-1 text-sm font-bold text-white transition-colors hover:border-white"
              >
                {t("researchHighlights.readPaper")}
              </a>
            ) : null}
          </div>
        </div>

        <div
          className="mt-8 flex items-center justify-between gap-5"
          role="group"
          aria-label={t("researchHighlights.controls")}
        >
          <div
            className="flex items-center gap-2"
            aria-label={t("researchHighlights.indicators")}
          >
            {items.map((highlight, index) => (
              <button
                key={highlight.id}
                type="button"
                onClick={() => interact(index)}
                aria-label={t("researchHighlights.goTo", {
                  number: index + 1,
                })}
                aria-current={index === active ? "true" : undefined}
                className={`h-2 rounded-full transition-all duration-300 ${
                  index === active
                    ? "w-10 bg-[var(--rams-red)]"
                    : "w-2 bg-white/30 hover:bg-white/60"
                }`}
              />
            ))}
          </div>
          <div className="flex items-center gap-3 text-sm font-semibold text-white">
            <button
              type="button"
              onClick={() => interact(active - 1)}
              aria-label={t("researchHighlights.previous")}
              className="flex h-10 w-10 items-center justify-center border border-white/20 text-white transition-colors hover:border-white hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
            >
              <Arrow direction="previous" />
            </button>
            <span className="min-w-14 text-center tabular-nums text-white/70">
              {String(active + 1).padStart(2, "0")} /{" "}
              {String(items.length).padStart(2, "0")}
            </span>
            <button
              type="button"
              onClick={() => interact(active + 1)}
              aria-label={t("researchHighlights.next")}
              className="flex h-10 w-10 items-center justify-center border border-white/20 text-white transition-colors hover:border-white hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
            >
              <Arrow direction="next" />
            </button>
          </div>
        </div>
      </PublicContainer>
    </section>
  );
}
