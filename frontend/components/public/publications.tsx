"use client";

import { usePathname, useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { getPublications, getPublicPublicationPdfUrl } from "@/lib/api/modules";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import type { Publication, PublicationFacets } from "@/types/modules";
import PublicContainer from "./public-container";
import { PublicError, PublicLoading } from "./public-states";

type PublicationProject = Publication;

type SortOrder = "newest" | "oldest";
type PublicationFilters = {
  search: string;
  year: string;
  topics: string[];
  methods: string[];
  sort: SortOrder;
};
type QueryParams = {
  get(name: string): string | null;
  getAll(name: string): string[];
};

function readFilters(params: QueryParams): PublicationFilters {
  const sort = params.get("sort");
  return {
    search: params.get("search") ?? "",
    year: params.get("year") ?? "",
    topics: params.getAll("topic"),
    methods: params.getAll("method"),
    sort: sort === "oldest" ? "oldest" : "newest",
  };
}

function writeFilters(filters: PublicationFilters) {
  const query = new URLSearchParams();
  if (filters.search) query.set("search", filters.search);
  if (filters.year) query.set("year", filters.year);
  filters.topics.forEach((topic) => query.append("topic", topic));
  filters.methods.forEach((method) => query.append("method", method));
  if (filters.sort === "oldest") query.set("sort", filters.sort);
  return query.toString();
}

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

function isActive(filters: PublicationFilters) {
  return Boolean(
    filters.search ||
    filters.year ||
    filters.topics.length ||
    filters.methods.length ||
    filters.sort === "oldest",
  );
}

const FILTER_LABEL =
  "text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-[var(--gray)]";
const FIELD_CLASS =
  "w-full rounded-[3px] border border-[var(--border)] bg-white px-3.5 py-2.5 text-sm text-[var(--navy)] outline-none transition-colors placeholder:text-[var(--gray)] focus:border-[var(--navy)] focus:ring-1 focus:ring-[var(--navy)]/15";

function PublicationFiltersPanel({
  filters,
  years,
  topics,
  methods,
  t,
  onChange,
  onClear,
  prefix,
}: {
  filters: PublicationFilters;
  years: number[];
  topics: { value: string; label: string }[];
  methods: string[];
  t: (key: string) => string;
  onChange: (next: Partial<PublicationFilters>) => void;
  onClear: () => void;
  prefix: string;
}) {
  const toggle = (key: "topics" | "methods", value: string) => {
    const current = filters[key];
    onChange({
      [key]: current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value],
    });
  };

  const chipClass = (checked: boolean) =>
    `inline-flex cursor-pointer items-center gap-1.5 rounded-[3px] border px-2.5 py-1 text-xs transition-colors ${
      checked
        ? "border-[var(--navy)] bg-[var(--navy)]/5 text-[var(--navy)]"
        : "border-[var(--border)] bg-white text-[var(--charcoal)] hover:border-[var(--gray)]"
    }`;

  return (
    <div className="space-y-7">
      <div>
        <label htmlFor={`${prefix}-year`} className={FILTER_LABEL}>
          {t("year")}
        </label>
        <select
          id={`${prefix}-year`}
          value={filters.year}
          onChange={(event) => onChange({ year: event.target.value })}
          className={`mt-2.5 ${FIELD_CLASS}`}
        >
          <option value="">{t("allYears")}</option>
          {years.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
      </div>

      <fieldset>
        <legend className={FILTER_LABEL}>{t("topic")}</legend>
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {topics.length ? (
            topics.map((topic) => {
              const checked = filters.topics.includes(topic.value);
              return (
                <label key={topic.value} className={chipClass(checked)}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle("topics", topic.value)}
                    className="h-3.5 w-3.5 accent-[var(--navy)]"
                  />
                  <span>{topic.label}</span>
                </label>
              );
            })
          ) : (
            <p className="text-xs text-[var(--gray)]">{t("noOptions")}</p>
          )}
        </div>
      </fieldset>

      <fieldset>
        <legend className={FILTER_LABEL}>{t("method")}</legend>
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {methods.length ? (
            methods.map((method) => {
              const checked = filters.methods.includes(method);
              return (
                <label key={method} className={chipClass(checked)}>
                  <input
                    id={`${prefix}-method-${slug(method)}`}
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle("methods", method)}
                    className="h-3.5 w-3.5 accent-[var(--navy)]"
                  />
                  <span>{method}</span>
                </label>
              );
            })
          ) : (
            <p className="text-xs text-[var(--gray)]">{t("noOptions")}</p>
          )}
        </div>
      </fieldset>

      {isActive(filters) && (
        <button
          type="button"
          onClick={onClear}
          className="text-xs font-semibold text-[var(--charcoal)] underline decoration-[var(--gray)]/40 underline-offset-4 transition-colors hover:text-[var(--navy)]"
        >
          {t("clearAll")}
        </button>
      )}
    </div>
  );
}

const PublicationCard = memo(function PublicationCard({
  project,
  t,
  selected,
  publicationId,
  onSelect,
}: {
  project: PublicationProject;
  t: (key: string) => string;
  selected: boolean;
  publicationId: string;
  onSelect: (id: string | null) => void;
}) {
  const publicationUrl = project.pdfUrl
    ? getPublicPublicationPdfUrl(project._id)
    : null;
  const publicationLinkLabel = t("viewPdf");

  const handleSelectChange = () => onSelect(publicationId);
  const handleSelectClick = (event: React.MouseEvent<HTMLInputElement>) => {
    event.stopPropagation();
    if (selected) onSelect(null);
  };
  const handleSelectMouseDown = (event: React.MouseEvent<HTMLInputElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };

  return (
    <article className="group relative rounded-[3px] border border-[var(--border)] bg-white p-5 shadow-[0_1px_2px_rgba(11,32,56,0.05)] sm:p-6">
      <input
        type="radio"
        checked={selected}
        onChange={handleSelectChange}
        onClick={handleSelectClick}
        onMouseDown={handleSelectMouseDown}
        aria-label={project.title}
        data-publication-node={publicationId}
        className="absolute -left-10 top-8 h-3.5 w-3.5 cursor-pointer appearance-none rounded-full bg-[var(--border)] ring-2 ring-white transition-colors checked:bg-[var(--charcoal)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--navy)] sm:-left-12"
      />
      <span
        aria-hidden="true"
        data-testid="publication-node-active"
        className="publication-timeline-progress-node pointer-events-none absolute -left-10 top-8 h-3.5 w-3.5 rounded-full bg-[var(--charcoal)] ring-2 ring-white sm:-left-12"
      />
      <h3 className="min-w-0 pr-16 font-display text-lg font-bold leading-snug text-[var(--navy)] sm:text-xl">
        {project.title}
      </h3>
      <span className="absolute right-0 top-0 rounded-bl-[3px] rounded-tr-[3px] bg-[var(--rams-red)] px-2.5 py-1 font-mono text-[0.7rem] font-semibold leading-4 text-white">
        {project.year}
      </span>
      <p className="mt-3 text-sm leading-6 text-[var(--charcoal)]">
        {project.authors.join(", ")}
      </p>
      <p className="mt-1.5 text-xs leading-5 text-[var(--gray)]">
        {project.publicationType} · {project.journal}
      </p>
      <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-[var(--border)] pt-4">
        {publicationUrl && (
          <a
            href={publicationUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--rams-red)] transition-colors hover:text-[var(--rams-red-dark)]"
            aria-label={`${publicationLinkLabel}: ${project.title}`}
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="mr-1 inline-block h-3.5 w-3.5 align-[-0.15em]"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M10 13a5 5 0 0 0 7.07.07l2-2a5 5 0 0 0-7.07-7.07l-1.14 1.14" />
              <path d="M14 11a5 5 0 0 0-7.07-.07l-2 2A5 5 0 0 0 7 20l1.14-1.14" />
            </svg>
            {publicationLinkLabel}
          </a>
        )}
        {project.doi && (
          <span className="font-mono text-xs text-[var(--gray)]">
            DOI: {project.doi}
          </span>
        )}
      </div>
    </article>
  );
});

const TIMELINE_READING_LINE_RATIO = 0.34;
const TIMELINE_NODE_FADE_PX = 48;

function useTimelineScrollProgress(ids: string[]) {
  const containerRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const measureNodes = () => {
      const containerRect = container.getBoundingClientRect();
      container
        .querySelectorAll<HTMLElement>("[data-publication-id]")
        .forEach((row) => {
          const node = row.querySelector<HTMLElement>(
            "[data-publication-node]",
          );
          const rect = (node ?? row).getBoundingClientRect();
          const centerY = rect.top - containerRect.top + rect.height / 2;
          row.style.setProperty("--node-top", `${centerY}px`);
        });
      container.style.setProperty("--node-ramp", `${TIMELINE_NODE_FADE_PX}px`);
    };

    const applyProgress = () => {
      const rect = container.getBoundingClientRect();
      const readingY = window.innerHeight * TIMELINE_READING_LINE_RATIO;
      const progress = Math.min(
        rect.height,
        Math.max(0, readingY - rect.top),
      );
      container.style.setProperty("--timeline-progress", `${progress}px`);
    };

    const scheduleProgress = () => {
      if (frameRef.current !== null) return;
      frameRef.current = window.requestAnimationFrame(() => {
        frameRef.current = null;
        applyProgress();
      });
    };

    const remeasure = () => {
      measureNodes();
      applyProgress();
    };

    remeasure();
    window.addEventListener("scroll", scheduleProgress, { passive: true });
    window.addEventListener("resize", remeasure);
    const resizeObserver =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(() => remeasure());
    resizeObserver?.observe(container);

    return () => {
      window.removeEventListener("scroll", scheduleProgress);
      window.removeEventListener("resize", remeasure);
      resizeObserver?.disconnect();
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    };
  }, [ids]);

  return containerRef;
}

function PublicationTimeline({
  groups,
  t,
  selectedPublicationId,
  onSelectPublication,
}: {
  groups: [number, PublicationProject[]][];
  t: (key: string) => string;
  selectedPublicationId: string | null;
  onSelectPublication: (id: string | null) => void;
}) {
  const publicationIds = useMemo(
    () =>
      groups.flatMap(([, items]) =>
        items.map((publication) => publication._id),
      ),
    [groups],
  );
  const containerRef = useTimelineScrollProgress(publicationIds);

  return (
    <div
      ref={containerRef}
      data-testid="publications-timeline"
      className="relative mt-8"
    >
      <span
        aria-hidden="true"
        data-testid="publications-timeline-line"
        className="absolute bottom-3 left-[7px] top-3 w-0.5 -translate-x-1/2 bg-[var(--border)]"
      />
      <span
        aria-hidden="true"
        data-testid="publications-timeline-progress"
        className="publication-timeline-progress-line absolute left-[7px] top-3 w-[3px] -translate-x-1/2 bg-[var(--rams-red)]"
      />
      {groups.map(([year, items], index) => (
        <section key={year} className={index === 0 ? "" : "mt-10"}>
          <div className="relative mb-4 pl-10 sm:pl-12">
            <h2 className="font-display text-sm font-semibold uppercase tracking-[0.18em] text-[var(--navy)]">
              {year}
            </h2>
          </div>
          <div className="space-y-5">
            {items.map((publication) => (
              <div
                key={publication._id}
                data-publication-id={publication._id}
                className="relative pl-10 sm:pl-12"
              >
                <PublicationCard
                  project={publication}
                  t={t}
                  selected={selectedPublicationId === publication._id}
                  publicationId={publication._id}
                  onSelect={onSelectPublication}
                />
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

export default function Publications() {
  const t = useTranslations("publications");
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryString = searchParams.toString();
  const [records, setRecords] = useState<PublicationProject[]>([]);
  const [facets, setFacets] = useState<PublicationFacets>({
    years: [],
    topics: [],
    methods: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [selectedPublicationId, setSelectedPublicationId] = useState<
    string | null
  >(null);

  const filters = useMemo(
    () => readFilters(new URLSearchParams(queryString)),
    [queryString],
  );
  const [searchInput, setSearchInput] = useState(filters.search);
  const searchUrlValue = useRef(filters.search);
  const debouncedSearch = useDebouncedValue(searchInput, 300);

  useEffect(() => {
    if (filters.search === searchUrlValue.current) return;
    searchUrlValue.current = filters.search;
    setSearchInput(filters.search);
  }, [filters.search]);

  useEffect(() => {
    let active = true;
    async function loadPublications() {
      setLoading(true);
      setError(false);
      try {
        const data = await getPublications({
          search: debouncedSearch.trim() || undefined,
          year: filters.year ? Number(filters.year) : undefined,
          topic: filters.topics,
          method: filters.methods,
          sort: filters.sort,
        });
        if (!active) return;
        setRecords(data.data ?? []);
        setFacets(data.facets ?? { years: [], topics: [], methods: [] });
      } catch {
        if (active) setError(true);
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadPublications();
    return () => {
      active = false;
    };
  }, [
    debouncedSearch,
    filters.methods,
    filters.sort,
    filters.topics,
    filters.year,
    reloadToken,
  ]);

  const updateFilters = (next: Partial<PublicationFilters>) => {
    const updated = { ...filters, search: searchInput, ...next };
    const query = writeFilters(updated);
    router.replace(query ? `${pathname}?${query}` : pathname, {
      scroll: false,
    });
  };

  const clearFilters = () => {
    setSearchInput("");
    router.replace(pathname, { scroll: false });
  };

  const visibleFilters = useMemo(
    () => ({ ...filters, search: debouncedSearch }),
    [debouncedSearch, filters],
  );

  const years = useMemo(
    () => [...facets.years].sort((a, b) => b - a),
    [facets.years],
  );
  const topicOptions = useMemo(
    () => facets.topics.map((value) => ({ value, label: value })),
    [facets.topics],
  );
  const methodOptions = useMemo(() => [...facets.methods], [facets.methods]);

  const visibleRecords = records;

  const groups = useMemo(() => {
    const grouped = new Map<number, PublicationProject[]>();
    visibleRecords.forEach((record) =>
      grouped.set(record.year, [...(grouped.get(record.year) ?? []), record]),
    );
    return Array.from(grouped.entries()).sort(([a], [b]) =>
      visibleFilters.sort === "newest" ? b - a : a - b,
    );
  }, [visibleFilters.sort, visibleRecords]);

  return (
    <section className="bg-[var(--background-light)]">
      <PublicContainer className="py-10 sm:py-12 lg:py-14">
        <header className="max-w-3xl border-b border-[var(--border)] pb-8">
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-[var(--gray)]">
            {t("heroEyebrow")}
          </p>
          <h1 className="mt-3 font-display text-3xl font-semibold leading-tight tracking-[-0.02em] text-[var(--navy)] sm:text-4xl">
            {t("heroTitle")}
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-[var(--gray)]">
            {t("heroDescription")}
          </p>
        </header>

        <div className="pt-8 lg:grid lg:grid-cols-[26%_minmax(0,1fr)] lg:items-start lg:gap-12">
          <div className="lg:hidden">
            <button
              type="button"
              onClick={() => setMobileFiltersOpen(true)}
              className="flex w-full items-center justify-between rounded-[3px] border border-[var(--border)] bg-white px-4 py-3 text-sm font-semibold text-[var(--navy)] focus:outline-none focus:ring-2 focus:ring-[var(--navy)]/20"
            >
              <span>{t("filterPublications")}</span>
              <span aria-hidden="true">＋</span>
            </button>
          </div>

          <aside
            className="hidden lg:sticky lg:top-[5.5rem] lg:block lg:self-start"
            aria-label={t("filterPublications")}
          >
            <div className="lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto lg:pr-1">
              <label htmlFor="publication-search-desktop" className="sr-only">
                {t("search")}
              </label>
              <input
                id="publication-search-desktop"
                type="search"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder={t("searchPlaceholder")}
                className={FIELD_CLASS}
              />
              <div className="mt-6">
                <PublicationFiltersPanel
                  filters={visibleFilters}
                  years={years}
                  topics={topicOptions}
                  methods={methodOptions}
                  t={t}
                  onChange={updateFilters}
                  onClear={clearFilters}
                  prefix="desktop"
                />
              </div>
            </div>
          </aside>

          <main className="relative mt-6 min-w-0 lg:mt-0">
            <div className="flex items-center justify-end gap-4 border-b border-[var(--border)] pb-4">
              <label className="flex items-center gap-2 text-sm text-[var(--gray)]">
                {t("sort")}
                <select
                  value={filters.sort}
                  onChange={(event) =>
                    updateFilters({ sort: event.target.value as SortOrder })
                  }
                  className="rounded-[3px] border border-[var(--border)] bg-white py-1 pl-2 pr-7 text-sm font-medium text-[var(--navy)] outline-none transition-colors focus:border-[var(--navy)]"
                >
                  <option value="newest">{t("newestFirst")}</option>
                  <option value="oldest">{t("oldestFirst")}</option>
                </select>
              </label>
            </div>

            <div className="mt-5 lg:hidden">
              <label htmlFor="publication-search-mobile" className="sr-only">
                {t("search")}
              </label>
              <input
                id="publication-search-mobile"
                type="search"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder={t("searchPlaceholder")}
                className={FIELD_CLASS}
              />
            </div>

            {loading && visibleRecords.length === 0 ? (
              <div className="mt-8">
                <PublicLoading label={t("loading")} />
              </div>
            ) : error ? (
              <div className="mt-8">
                <PublicError
                  message={t("error")}
                  onRetry={() => setReloadToken((value) => value + 1)}
                />
              </div>
            ) : visibleRecords.length === 0 ? (
              <div className="mt-8 rounded-[3px] border border-dashed border-[var(--border)] bg-white p-10 text-center">
                <h2 className="font-display text-xl font-semibold text-[var(--navy)]">
                  {t("emptyTitle")}
                </h2>
                <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[var(--gray)]">
                  {t("emptyDescription")}
                </p>
                {isActive(visibleFilters) && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="mt-6 text-sm font-semibold text-[var(--charcoal)] underline decoration-[var(--gray)]/40 underline-offset-4 hover:text-[var(--navy)]"
                  >
                    {t("clearAll")}
                  </button>
                )}
              </div>
            ) : (
              <PublicationTimeline
                groups={groups}
                t={t}
                selectedPublicationId={selectedPublicationId}
                onSelectPublication={setSelectedPublicationId}
              />
            )}
          </main>
        </div>
      </PublicContainer>

      {mobileFiltersOpen && (
        <div className="fixed inset-0 z-[70] lg:hidden" role="presentation">
          <button
            type="button"
            aria-label={t("closeFilters")}
            onClick={() => setMobileFiltersOpen(false)}
            className="absolute inset-0 bg-[var(--navy)]/35"
          />
          <aside
            role="dialog"
            aria-modal="true"
            aria-labelledby="mobile-publication-filters-title"
            className="absolute inset-y-0 right-0 w-[min(90vw,24rem)] overflow-y-auto border-l border-[var(--border)] bg-white p-6"
          >
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-5">
              <h2
                id="mobile-publication-filters-title"
                className="font-display text-lg font-semibold text-[var(--navy)]"
              >
                {t("filterPublications")}
              </h2>
              <button
                type="button"
                onClick={() => setMobileFiltersOpen(false)}
                className="text-2xl leading-none text-[var(--gray)] focus:outline-none focus:ring-2 focus:ring-[var(--navy)]/20"
                aria-label={t("closeFilters")}
              >
                ×
              </button>
            </div>
            <div className="py-6">
              <PublicationFiltersPanel
                filters={visibleFilters}
                years={years}
                topics={topicOptions}
                methods={methodOptions}
                t={t}
                onChange={updateFilters}
                onClear={clearFilters}
                prefix="mobile"
              />
            </div>
            <div className="sticky bottom-0 -mx-6 border-t border-[var(--border)] bg-white px-6 pt-4">
              <button
                type="button"
                onClick={() => setMobileFiltersOpen(false)}
                className="w-full rounded-[3px] bg-[var(--navy)] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[var(--navy-deep)]"
              >
                {t("apply")}
              </button>
            </div>
          </aside>
        </div>
      )}
    </section>
  );
}
