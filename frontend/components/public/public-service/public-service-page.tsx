"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  getPublicPartners,
  getPublicServiceProjectsList,
} from "@/lib/api/modules";
import type {
  Partner,
  PublicServiceProjectPageItem,
  PublicServiceProjectFacets,
} from "@/types/modules";
import PageHero from "../page-hero";
import PublicContainer from "../public-container";

export default function PublicServicePage() {
  const locale = useLocale() === "id" ? "id" : "en";
  const t = useTranslations("publicService");
  const common = useTranslations("common");
  const [industrialPartners, setIndustrialPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [row1, row2] = useMemo(() => {
    const mid = Math.ceil(industrialPartners.length / 2);
    return [industrialPartners.slice(0, mid), industrialPartners.slice(mid)];
  }, [industrialPartners]);

  useEffect(() => {
    let cancelled = false;

    getPublicPartners("INDUSTRIAL")
      .then((result) => {
        if (!cancelled) setIndustrialPartners(result);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main>
      <PageHero eyebrow="" title={t("title")} description={t("description")} />
      <PublicContainer className="space-y-16 py-16 sm:py-20">
        {loading ? (
          <p className="text-sm font-semibold text-[var(--rams-gray)]">
            {common("loading")}
          </p>
        ) : error ? (
          <p className="text-sm font-semibold text-red-700">
            {common("requestUnavailable")}
          </p>
        ) : (
          <>
            {industrialPartners.length > 0 && (
              <section>
                <SectionTitle eyebrow="" title={t("industrialPartnersTitle")} />
                <div className="space-y-10">
                  {row1.length > 0 && (
                    <MarqueeRow
                      partners={row1}
                      direction="left"
                      ariaLabel={t("industrialPartnersTitle")}
                    />
                  )}
                  {row2.length > 0 && (
                    <MarqueeRow
                      partners={row2}
                      direction="right"
                      ariaLabel={t("industrialPartnersTitle")}
                    />
                  )}
                </div>
              </section>
            )}
          </>
        )}

        <ProjectsSection locale={locale} />
      </PublicContainer>
    </main>
  );
}

function SectionTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div>
      {eyebrow ? (
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--rams-red)]">
          {eyebrow}
        </p>
      ) : null}
      <h2
        className={`${eyebrow ? "mt-3" : ""} text-3xl font-bold text-[var(--navy)]`}
      >
        {title}
      </h2>
    </div>
  );
}

/* ========================================
   MARQUEE ROW (requestAnimationFrame)
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
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [oneSetWidth, setOneSetWidth] = useState(0);
  const offsetRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const prevTimeRef = useRef<number | null>(null);
  const pausedRef = useRef(false);

  const PX_PER_SEC = 12;

  const measure = useCallback(() => {
    if (!trackRef.current) return;
    const w = trackRef.current.scrollWidth / 2;
    if (w > 0) setOneSetWidth(w);
  }, []);

  useEffect(() => {
    measure();
    const ro = new ResizeObserver(measure);
    if (trackRef.current) ro.observe(trackRef.current);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [measure, partners]);

  useEffect(() => {
    if (oneSetWidth <= 0) return;

    const initial = direction === "left" ? 0 : -oneSetWidth;
    offsetRef.current = initial;
    prevTimeRef.current = null;

    if (trackRef.current) {
      trackRef.current.style.transform = `translate3d(${initial}px,0,0)`;
    }

    function tick(now: number) {
      if (pausedRef.current) {
        prevTimeRef.current = null;
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      if (prevTimeRef.current === null) {
        prevTimeRef.current = now;
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      const dt = (now - prevTimeRef.current) / 1000;
      prevTimeRef.current = now;

      const delta = PX_PER_SEC * dt;
      let off = offsetRef.current;

      if (direction === "left") {
        off -= delta;
        if (off <= -oneSetWidth) off += oneSetWidth;
      } else {
        off += delta;
        if (off >= 0) off -= oneSetWidth;
      }

      offsetRef.current = off;

      if (trackRef.current) {
        trackRef.current.style.transform = `translate3d(${off}px,0,0)`;
      }

      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [oneSetWidth, direction]);

  return (
    <div
      className="partner-marquee-row group relative mt-8"
      role="region"
      aria-label={ariaLabel}
      onMouseEnter={() => (pausedRef.current = true)}
      onMouseLeave={() => (pausedRef.current = false)}
    >
      <div
        className="pointer-events-none absolute left-0 top-0 z-10 h-full w-16 sm:w-24"
        style={{
          background: "linear-gradient(to right, var(--paper), transparent)",
        }}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute right-0 top-0 z-10 h-full w-16 sm:w-24"
        style={{
          background: "linear-gradient(to left, var(--paper), transparent)",
        }}
        aria-hidden="true"
      />

      <div className="overflow-hidden" ref={viewportRef}>
        <div ref={trackRef} className="flex w-max will-change-transform">
          {[...partners, ...partners].map((partner, i) => (
            <MarqueeItem key={`${partner._id}-${i}`} partner={partner} />
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
    <div className="flex flex-col items-center gap-2">
      <Image
        src={partner.logo}
        alt={partner.name}
        width={200}
        height={80}
        className="h-10 w-auto object-contain sm:h-14 md:h-16 lg:h-20 xl:h-24"
      />
      <span className="hidden text-[0.65rem] font-medium tracking-wide text-[var(--gray)] sm:inline">
        {partner.name}
      </span>
    </div>
  ) : (
    <div className="flex flex-col items-center gap-2">
      <div className="flex h-10 w-28 items-center justify-center rounded border border-[var(--border)] bg-white px-3 text-[0.65rem] font-bold leading-tight text-[var(--navy)] sm:h-14 sm:w-32 md:h-16 md:w-40 lg:h-20 lg:w-48 xl:h-24 xl:w-56">
        {partner.name}
      </div>
      <span className="hidden text-[0.65rem] font-medium tracking-wide text-[var(--gray)] sm:inline">
        {partner.name}
      </span>
    </div>
  );

  const sharedClass =
    "flex-shrink-0 px-5 sm:px-6 md:px-8 lg:px-10 xl:px-12 flex items-center justify-center transition duration-300 hover:scale-105";

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

const PROJECTS_PER_PAGE = 10;

function ProjectsSection({ locale }: { locale: "en" | "id" }) {
  const t = useTranslations("publicService");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [yearGroup, setYearGroup] = useState<string | undefined>();
  const [client, setClient] = useState<string | undefined>();
  const [sort, setSort] = useState<"newest" | "oldest">("newest");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<PublicServiceProjectPageItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [facets, setFacets] = useState<PublicServiceProjectFacets | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queryRef = useRef({ search, yearGroup, client, sort, page });
  const localized = (value?: { en: string; id: string }) =>
    value?.[locale] || value?.en || value?.id || "";

  useEffect(() => {
    queryRef.current = { search, yearGroup, client, sort, page };
  });

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      try {
        const q = queryRef.current;
        const res = await getPublicServiceProjectsList({
          search: q.search,
          yearGroup: q.yearGroup,
          client: q.client,
          sort: q.sort,
          page: q.page,
          limit: PROJECTS_PER_PAGE,
        });
        if (cancelled) return;
        setItems(res.data ?? []);
        setTotal(res.total ?? 0);
        setFacets(res.facets ?? null);
      } catch {
        if (!cancelled) {
          setItems([]);
          setTotal(0);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [search, yearGroup, client, sort, page]);

  function handleSearchChange(value: string) {
    setSearchInput(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearch(value.trim());
      setPage(1);
    }, 350);
  }

  const totalPages = Math.max(1, Math.ceil(total / PROJECTS_PER_PAGE));

  return (
    <section>
      <SectionTitle eyebrow="" title={t("projectsTitle")} />

      <div className="mt-8 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            type="text"
            placeholder={t("projectsSearchPlaceholder")}
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full rounded-md border border-[var(--border)] bg-white px-4 py-2.5 text-sm text-[var(--navy)] outline-none transition placeholder:text-[var(--gray)] focus:border-[var(--rams-red)] focus:ring-2 focus:ring-red-100 sm:max-w-xs"
          />
          <select
            value={sort}
            onChange={(e) => {
              setSort(e.target.value as "newest" | "oldest");
              setPage(1);
            }}
            className="rounded-md border border-[var(--border)] bg-white px-3 py-2.5 text-sm text-[var(--navy)] outline-none focus:border-[var(--rams-red)]"
          >
            <option value="newest">{t("projectsSortNewest")}</option>
            <option value="oldest">{t("projectsSortOldest")}</option>
          </select>
        </div>

        <div className="flex flex-wrap gap-3">
          {facets && facets.yearGroups.length > 0 && (
            <select
              value={yearGroup ?? ""}
              onChange={(e) => {
                setYearGroup(e.target.value || undefined);
                setPage(1);
              }}
              className="rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm text-[var(--navy)] outline-none focus:border-[var(--rams-red)]"
            >
              <option value="">{t("projectsFilterYear")}</option>
              {facets.yearGroups.map((yg) => (
                <option key={yg} value={yg}>
                  {yg}
                </option>
              ))}
            </select>
          )}
          {facets && facets.clients.length > 0 && (
            <select
              value={client ?? ""}
              onChange={(e) => {
                setClient(e.target.value || undefined);
                setPage(1);
              }}
              className="rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm text-[var(--navy)] outline-none focus:border-[var(--rams-red)]"
            >
              <option value="">{t("projectsFilterClient")}</option>
              {facets.clients.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          )}
        </div>

        {loading ? (
          <p className="py-8 text-sm font-semibold text-[var(--rams-gray)]">
            {t("projectsLoading")}
          </p>
        ) : items.length === 0 ? (
          <p className="py-8 text-sm font-semibold text-[var(--rams-gray)]">
            {t("projectsEmpty")}
          </p>
        ) : (
          <>
            <div className="hidden overflow-x-auto border border-[var(--border)] bg-white md:block">
              <table className="w-full min-w-[600px] text-left">
                <thead className="border-b border-[var(--border)] bg-[var(--background-light)]">
                  <tr>
                    {[
                      t("projectsTableNo"),
                      t("projectsTableTitle"),
                      t("projectsTableClient"),
                      t("projectsTablePeriod"),
                    ].map((heading) => (
                      <th
                        key={heading}
                        className="px-5 py-3.5 text-xs font-bold uppercase tracking-wide text-[var(--gray)]"
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {items.map((project, index) => (
                    <tr
                      key={project.id}
                      className="transition hover:bg-[var(--background-light)]"
                    >
                      <td className="px-5 py-4 text-sm text-[var(--charcoal)]">
                        {(page - 1) * PROJECTS_PER_PAGE + index + 1}
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-semibold text-[var(--navy)]">
                          {localized(project.title)}
                        </p>
                      </td>
                      <td className="px-5 py-4 text-sm text-[var(--charcoal)]">
                        {project.client}
                      </td>
                      <td className="px-5 py-4 text-sm text-[var(--charcoal)]">
                        {project.period || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="space-y-4 md:hidden">
              {items.map((project, index) => (
                <article
                  key={project.id}
                  className="border border-[var(--border)] bg-white p-5"
                >
                  <div className="flex items-start gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center bg-[var(--background-light)] text-xs font-bold text-[var(--charcoal)]">
                      {(page - 1) * PROJECTS_PER_PAGE + index + 1}
                    </span>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-[var(--navy)]">
                        {localized(project.title)}
                      </h3>
                      <dl className="mt-3 space-y-1 text-sm text-[var(--charcoal)]">
                        <div className="flex gap-2">
                          <dt className="font-semibold">
                            {t("projectsTableClient")}:
                          </dt>
                          <dd>{project.client}</dd>
                        </div>
                        <div className="flex gap-2">
                          <dt className="font-semibold">
                            {t("projectsTablePeriod")}:
                          </dt>
                          <dd>{project.period || "—"}</dd>
                        </div>
                      </dl>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-[var(--border)] pt-4">
                <p className="text-sm text-[var(--gray)]">
                  {t("projectsPageOf", { page, totalPages })}
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={page === 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="rounded-md border border-[var(--border)] bg-white px-4 py-2 text-sm font-semibold text-[var(--navy)] transition hover:bg-[var(--background-light)] disabled:opacity-40"
                  >
                    {t("projectsPrev")}
                  </button>
                  <button
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="rounded-md border border-[var(--border)] bg-white px-4 py-2 text-sm font-semibold text-[var(--navy)] transition hover:bg-[var(--background-light)] disabled:opacity-40"
                  >
                    {t("projectsNext")}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
