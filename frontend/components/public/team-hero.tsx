import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import PublicContainer from "./public-container";

function MaritimeBlueprint({ label }: { label: string }) {
  return (
    <svg
      viewBox="0 0 760 440"
      width="760"
      height="440"
      role="img"
      aria-label={label}
      preserveAspectRatio="xMidYMid meet"
      className="h-auto w-full"
    >
      <title>{label}</title>
      <defs>
        <pattern
          id="team-blueprint-dots"
          width="18"
          height="18"
          patternUnits="userSpaceOnUse"
        >
          <circle cx="1.4" cy="1.4" r="1" fill="#2878C7" opacity="0.22" />
        </pattern>
        <pattern
          id="team-blueprint-grid"
          width="76"
          height="76"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M76 0H0V76"
            fill="none"
            stroke="#2878C7"
            strokeWidth="0.5"
            opacity="0.2"
          />
        </pattern>
        <linearGradient id="team-hull-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#69B7F0" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#2878C7" stopOpacity="0.04" />
        </linearGradient>
      </defs>

      <rect width="760" height="440" fill="url(#team-blueprint-dots)" />
      <rect width="760" height="440" fill="url(#team-blueprint-grid)" />

      <g fill="none" stroke="#2878C7" opacity="0.45">
        <circle
          cx="220"
          cy="172"
          r="138"
          strokeWidth="0.7"
          strokeDasharray="3 7"
        />
        <circle cx="220" cy="172" r="99" strokeWidth="0.7" />
        <circle
          cx="220"
          cy="172"
          r="62"
          strokeWidth="0.6"
          strokeDasharray="2 6"
        />
        <circle cx="220" cy="172" r="23" strokeWidth="0.6" />
        <line
          x1="62"
          y1="172"
          x2="378"
          y2="172"
          strokeWidth="0.6"
          strokeDasharray="2 8"
        />
        <line
          x1="220"
          y1="14"
          x2="220"
          y2="330"
          strokeWidth="0.6"
          strokeDasharray="2 8"
        />
        <path d="M220 34 A138 138 0 0 1 358 172" strokeWidth="1.4" />
        <path d="M220 73 A99 99 0 0 0 121 172" strokeWidth="1.1" opacity="0.7" />
      </g>

      <g fill="#1769AA" opacity="0.55">
        <circle cx="220" cy="172" r="2.4" />
        <circle cx="295" cy="118" r="1.8" />
        <circle cx="150" cy="132" r="1.4" />
        <circle cx="268" cy="238" r="1.6" />
        <circle cx="112" cy="212" r="1.2" />
      </g>

      <g
        fill="#1769AA"
        fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
        fontSize="7.5"
        letterSpacing="1.4"
        opacity="0.7"
      >
        <text x="54" y="38">
          SURVEY GRID
        </text>
        <text x="54" y="52">
          RADAR ARRAY
        </text>
      </g>

      <g
        fill="none"
        stroke="#142A45"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path
          d="M246 286 H652 L704 254 L682 234 H270 L244 258 Z"
          fill="url(#team-hull-fill)"
        />
        <path d="M270 234 H682" strokeWidth="1.4" />
        <path
          d="M252 272 H676"
          strokeWidth="0.7"
          strokeDasharray="4 6"
          opacity="0.55"
        />
        <path d="M280 244 H670" strokeWidth="0.6" opacity="0.4" />

        <path
          d="M300 246 V280 M360 246 V282 M420 246 V283 M480 246 V283 M540 246 V282 M600 246 V280 M660 246 V275"
          strokeWidth="0.6"
          opacity="0.28"
        />

        <path
          d="M418 234 V186 H462 V168 H548 V234"
          fill="#FFFFFF"
          fillOpacity="0.32"
        />
        <path d="M430 204 H536" strokeWidth="0.7" opacity="0.55" />
        <path d="M430 216 H536" strokeWidth="0.7" opacity="0.55" />
        <path d="M430 228 H536" strokeWidth="0.7" opacity="0.55" />
        <path d="M500 186 V234" strokeWidth="0.7" opacity="0.35" />
        <rect
          x="466"
          y="176"
          width="28"
          height="9"
          fill="#69B7F0"
          fillOpacity="0.3"
          strokeWidth="0.7"
        />

        <path d="M352 234 V206 H382 V234" fill="#FFFFFF" fillOpacity="0.28" />
        <path d="M352 206 H382" strokeWidth="0.8" />
        <path d="M356 200 H378" strokeWidth="0.7" opacity="0.6" />

        <path d="M300 234 V200 L334 184" strokeWidth="0.9" />
        <path d="M334 184 V206" strokeWidth="0.6" strokeDasharray="2 3" />
        <circle cx="334" cy="210" r="2.6" strokeWidth="0.7" />

        <path d="M600 234 V128" strokeWidth="1" />
        <path d="M586 154 H614" strokeWidth="0.8" />
        <path d="M590 172 H610" strokeWidth="0.8" />
        <circle cx="600" cy="118" r="9" strokeWidth="0.9" />
        <path d="M600 109 V102" strokeWidth="0.8" />
        <path d="M591 118 H609" strokeWidth="0.6" opacity="0.6" />

        <path d="M660 234 V186" strokeWidth="0.9" />
        <path d="M652 196 H668" strokeWidth="0.7" />
        <path d="M660 186 V174" strokeWidth="0.7" />

        <path d="M560 216 Q572 208 586 216 Q572 222 560 216 Z" strokeWidth="0.8" />
      </g>

      <g
        fill="none"
        stroke="#2878C7"
        strokeWidth="0.8"
        fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
        fontSize="7.5"
        letterSpacing="1.2"
      >
        <path d="M548 206 L616 174" />
        <circle cx="548" cy="206" r="2" fill="#2878C7" />
        <text x="620" y="171" fill="#1769AA" stroke="none">
          BRIDGE
        </text>

        <path d="M336 234 L298 196" />
        <circle cx="336" cy="234" r="2" fill="#2878C7" />
        <text x="230" y="190" fill="#1769AA" stroke="none">
          SURVEY DECK
        </text>

        <path d="M330 282 L286 316" />
        <circle cx="330" cy="282" r="2" fill="#2878C7" />
        <text x="230" y="330" fill="#1769AA" stroke="none">
          HULL
        </text>

        <path d="M70 330 H120" strokeWidth="0.6" opacity="0.6" />
        <path d="M86 324 V336" strokeWidth="0.6" opacity="0.6" />
        <path d="M104 324 V336" strokeWidth="0.6" opacity="0.6" />
        <text x="70" y="348" fill="#1769AA" stroke="none" opacity="0.75">
          S-04
        </text>

        <path d="M708 96 V146" strokeWidth="0.6" opacity="0.6" />
        <path d="M702 110 H714" strokeWidth="0.6" opacity="0.6" />
        <path d="M702 128 H714" strokeWidth="0.6" opacity="0.6" />
        <text x="716" y="92" fill="#1769AA" stroke="none" opacity="0.75">
          S-05
        </text>
      </g>

      <g
        fill="none"
        stroke="#2878C7"
        strokeLinecap="round"
        strokeWidth="1.4"
        opacity="0.55"
      >
        <path d="M20 318 C 120 296, 214 338, 310 318 S 502 296, 596 318 S 704 340, 748 318" />
      </g>
      <g
        fill="none"
        stroke="#2878C7"
        strokeLinecap="round"
        strokeWidth="1"
        opacity="0.36"
      >
        <path d="M0 336 C 110 314, 206 356, 306 336 S 500 314, 600 336 S 712 358, 760 336" />
      </g>
      <g
        fill="none"
        stroke="#2878C7"
        strokeLinecap="round"
        strokeWidth="0.8"
        opacity="0.22"
      >
        <path d="M30 354 C 140 334, 230 374, 330 354 S 520 334, 620 354 S 720 372, 756 354" />
      </g>
      <g
        fill="none"
        stroke="#2878C7"
        strokeLinecap="round"
        strokeWidth="0.6"
        opacity="0.14"
      >
        <path d="M0 372 C 120 354, 220 390, 320 372 S 520 354, 620 372 S 730 390, 760 372" />
      </g>

      <g fill="#1769AA">
        <circle cx="96" cy="310" r="1.6" opacity="0.45" />
        <circle cx="188" cy="326" r="1.2" opacity="0.4" />
        <circle cx="356" cy="307" r="1.5" opacity="0.4" />
        <circle cx="470" cy="327" r="1.3" opacity="0.35" />
        <circle cx="648" cy="309" r="1.6" opacity="0.4" />
        <circle cx="706" cy="344" r="1.2" opacity="0.3" />
        <circle cx="58" cy="356" r="1.1" opacity="0.3" />
        <circle cx="520" cy="360" r="1.2" opacity="0.25" />
      </g>
    </svg>
  );
}

export default function TeamHero() {
  const t = useTranslations("team");
  const brand = useTranslations("brand");

  return (
    <section
      id="hero"
      data-hero-tone="light"
      className="team-page team-hero-surface relative overflow-hidden border-b border-[var(--team-border)]"
    >
      <div
        className="team-blueprint-grid pointer-events-none absolute inset-0 opacity-40"
        aria-hidden="true"
      />
      <PublicContainer className="relative">
        <div className="grid items-center gap-8 py-10 sm:py-12 md:min-h-[400px] md:grid-cols-[minmax(0,0.88fr)_minmax(0,1.12fr)] md:gap-8 md:py-8 lg:gap-10">
          <div className="hero-entrance min-w-0">
            <nav aria-label={t("breadcrumbLabel")} className="text-xs">
              <ol className="flex flex-wrap items-center gap-2 text-[var(--team-muted)]">
                <li>
                  <Link
                    href="/"
                    className="transition-colors hover:text-[var(--team-blue)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--team-blue)]"
                  >
                    {brand("laboratory")}
                  </Link>
                </li>
                <li aria-hidden="true">/</li>
                <li
                  aria-current="page"
                  className="font-medium text-[var(--team-navy)]"
                >
                  {t("heroBreadcrumbCurrent")}
                </li>
              </ol>
            </nav>

            <p className="mt-6 text-xs font-bold uppercase tracking-[0.24em] text-[var(--team-blue)]">
              {t("heroEyebrow")}
            </p>

            <h1 className="mt-3 font-display text-[2.35rem] font-semibold leading-[1.05] tracking-[-0.04em] text-[var(--team-navy)] sm:text-[2.9rem] md:text-[2.5rem] lg:text-[3.4rem]">
              {t("heroTitle")}
            </h1>

            <p className="mt-5 max-w-lg text-[0.98rem] leading-7 text-[var(--team-text)] sm:text-base">
              {t("heroDescription")}
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <a
                href="#people-directory"
                className="inline-flex min-h-11 items-center justify-center rounded-[6px] bg-[var(--team-navy)] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--team-blue)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--team-blue)] active:bg-[var(--team-navy)]"
              >
                {t("heroPrimaryCta")}
              </a>
              <Link
                href="/about"
                className="inline-flex min-h-11 items-center justify-center rounded-[6px] border border-[var(--team-border)] bg-white px-5 py-2.5 text-sm font-semibold text-[var(--team-navy)] transition-colors hover:border-[var(--team-blue)] hover:text-[var(--team-blue)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--team-blue)] active:bg-[var(--team-bg-soft)]"
              >
                {t("heroSecondaryCta")}
              </Link>
            </div>
          </div>

          <div className="relative min-w-0">
            <div className="mb-2 flex justify-end md:absolute md:right-1 md:top-0 md:z-10 md:mb-0">
              <div className="text-right">
                <p className="text-[0.6rem] font-bold uppercase tracking-[0.24em] text-[var(--team-navy)]">
                  {t("heroAnnotationTitle")}
                </p>
                <p className="mt-1 text-[0.64rem] leading-4 tracking-[0.04em] text-[var(--team-muted)]">
                  {t("heroAnnotationLine")}
                </p>
              </div>
            </div>
            <MaritimeBlueprint label={t("heroVisualLabel")} />
          </div>
        </div>
      </PublicContainer>
    </section>
  );
}
