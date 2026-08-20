"use client";

import { usePathname, useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type RefObject } from "react";
import { useTranslations } from "next-intl";
import { getPublications } from "@/lib/api/modules";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import type { Publication } from "@/types/modules";
import PublicContainer from "./public-container";
import { PublicError, PublicLoading } from "./public-states";
import { MaritimeShip } from "./maritime-motion";

type PublicationProject = Publication;

type SortOrder = "newest" | "oldest";
type PublicationFilters = { search: string; year: string; topics: string[]; methods: string[]; sort: SortOrder };
type QueryParams = { get(name: string): string | null; getAll(name: string): string[] };

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

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b));
}

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

function isActive(filters: PublicationFilters) {
  return Boolean(filters.search || filters.year || filters.topics.length || filters.methods.length || filters.sort === "oldest");
}

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
    onChange({ [key]: current.includes(value) ? current.filter((item) => item !== value) : [...current, value] });
  };

  return <div className="space-y-8">
    <div>
      <label htmlFor={`${prefix}-year`} className="eyebrow">{t("year")}</label>
      <select id={`${prefix}-year`} value={filters.year} onChange={(event) => onChange({ year: event.target.value })} className="mt-3 w-full border border-[var(--border)] bg-white px-3 py-2.5 text-sm text-[var(--navy)] outline-none transition focus:border-[var(--rams-red)] focus:ring-2 focus:ring-[var(--rams-red)]/15">
        <option value="">{t("allYears")}</option>
        {years.map((year) => <option key={year} value={year}>{year}</option>)}
      </select>
    </div>

    <fieldset>
      <legend className="eyebrow">{t("topic")}</legend>
      <div className="mt-4 space-y-3">
        {topics.length ? topics.map((topic) => <label key={topic.value} className="flex cursor-pointer items-start gap-3 text-sm text-[var(--slate)]">
          <input type="checkbox" checked={filters.topics.includes(topic.value)} onChange={() => toggle("topics", topic.value)} className="mt-0.5 h-4 w-4 accent-[var(--rams-red)]" />
          <span>{topic.label}</span>
        </label>) : <p className="text-sm text-[var(--gray)]">{t("noOptions")}</p>}
      </div>
    </fieldset>

    <fieldset>
      <legend className="eyebrow">{t("method")}</legend>
      <div className="mt-4 space-y-3">
        {methods.length ? methods.map((method) => <label key={method} className="flex cursor-pointer items-start gap-3 text-sm text-[var(--slate)]">
          <input id={`${prefix}-method-${slug(method)}`} type="checkbox" checked={filters.methods.includes(method)} onChange={() => toggle("methods", method)} className="mt-0.5 h-4 w-4 accent-[var(--rams-red)]" />
          <span>{method}</span>
        </label>) : <p className="text-sm text-[var(--gray)]">{t("noOptions")}</p>}
      </div>
    </fieldset>

    {isActive(filters) && <button type="button" onClick={onClear} className="text-sm font-semibold text-[var(--rams-red)] underline decoration-[var(--rams-red)]/30 underline-offset-4 transition hover:text-[var(--rams-red-dark)]">{t("clearAll")}</button>}
  </div>;
}

function PublicationCard({ project, t, active, staged = false }: { project: PublicationProject; t: (key: string) => string; active: boolean; staged?: boolean }) {
  const publicationUrl = project.pdfUrl ?? (project.doi ? `https://doi.org/${project.doi}` : null);
  const publicationLinkLabel = t("viewPublication");

  return <article className={`group border bg-white p-6 transition-[opacity,transform,border-color,box-shadow] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:translate-y-0 motion-reduce:opacity-100 motion-reduce:transition-none sm:p-7 ${staged && !active ? "pointer-events-none translate-y-3 border-[var(--border)] opacity-0" : active ? "translate-y-0 border-[var(--rams-red)]/55 opacity-100 shadow-[0_10px_28px_rgba(11,32,56,0.07)]" : "translate-y-3 border-[var(--border)] opacity-70"} hover:-translate-y-0.5 hover:border-[var(--rams-red)]/55 hover:shadow-[0_10px_28px_rgba(11,32,56,0.07)]`}>
    <div className="flex items-start justify-between gap-4">
      <p className="eyebrow text-[var(--ais-blue)]">{t("publicationRecord")}</p>
      <span className="border border-[var(--rams-red)]/25 px-2 py-1 font-mono text-[0.65rem] font-semibold text-[var(--rams-red)]">{project.year}</span>
    </div>
    <h3 className="mt-6 max-w-2xl font-display text-xl font-semibold leading-tight text-[var(--navy)] sm:text-2xl">{project.title}</h3>
    <p className="mt-4 text-sm leading-6 text-[var(--slate)]">{project.authors.join(", ")}</p>
    <p className="mt-2 text-sm text-[var(--gray)]">{project.publicationType} · {project.journal}</p>
    <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-[var(--border)] pt-5">
      {publicationUrl && <a href={publicationUrl} target="_blank" rel="noreferrer" className="text-xs font-bold tracking-[0.08em] text-[var(--rams-red)] transition hover:text-[var(--rams-red-dark)]" aria-label={`${publicationLinkLabel}: ${project.title}`}>{publicationLinkLabel} <span aria-hidden="true">↗</span></a>}
      {project.doi && <span className="font-mono text-xs text-[var(--gray)]">DOI: {project.doi}</span>}
    </div>
  </article>;
}

const PUBLIC_HEADER_HEIGHT_PX = 80;

function useStickyPublicationProgress(sectionRef: RefObject<HTMLDivElement | null>, stickyViewportRef: RefObject<HTMLDivElement | null>, streamViewportRef: RefObject<HTMLDivElement | null>, streamRef: RefObject<HTMLDivElement | null>, contentKey: string, count: number) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [streamOffset, setStreamOffset] = useState(0);
  const [streamTravel, setStreamTravel] = useState(0);
  const streamTravelRef = useRef(0);

  useEffect(() => {
    if (count === 0) {
      const resetFrame = window.requestAnimationFrame(() => { setActiveIndex(0); setStreamOffset(0); setStreamTravel(0); streamTravelRef.current = 0; });
      return () => window.cancelAnimationFrame(resetFrame);
    }

    const mediaQuery = window.matchMedia("(min-width: 1024px)");
    const reduceMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!mediaQuery.matches || reduceMotionQuery.matches) {
      const resetFrame = window.requestAnimationFrame(() => { setActiveIndex(0); setStreamOffset(0); setStreamTravel(0); streamTravelRef.current = 0; });
      return () => window.cancelAnimationFrame(resetFrame);
    }

    let frame = 0;
    let measureFrame = 0;
    let followUpMeasureFrame = 0;
    const updateProgress = (travel = streamTravelRef.current) => {
      frame = 0;
      const section = sectionRef.current;
      const stickyViewport = stickyViewportRef.current;
      if (!section || !stickyViewport || travel <= 0) {
        setStreamOffset(0);
        setActiveIndex(0);
        return;
      }
      const sectionTop = section.getBoundingClientRect().top;
      const progress = Math.min(1, Math.max(0, (PUBLIC_HEADER_HEIGHT_PX - sectionTop) / travel));
      const nextOffset = travel * progress;
      const nextIndex = Math.min(count - 1, Math.floor(progress * count));
      setStreamOffset((current) => current === nextOffset ? current : nextOffset);
      setActiveIndex((current) => current === nextIndex ? current : nextIndex);
    };
    const requestProgressUpdate = () => {
      if (!frame) frame = window.requestAnimationFrame(() => updateProgress());
    };
    const measureStream = () => {
      const streamViewport = streamViewportRef.current;
      const stream = streamRef.current;
      if (!streamViewport || !stream) return;
      const nextTravel = Math.max(stream.scrollHeight - streamViewport.clientHeight, 0);
      if (streamTravelRef.current !== nextTravel) {
        streamTravelRef.current = nextTravel;
        setStreamTravel(nextTravel);
      }
      updateProgress(nextTravel);
    };
    const measureAfterLayout = () => {
      measureStream();
      followUpMeasureFrame = window.requestAnimationFrame(measureStream);
    };

    requestProgressUpdate();
    window.addEventListener("scroll", requestProgressUpdate, { passive: true });
    window.addEventListener("resize", requestProgressUpdate);
    window.addEventListener("resize", measureStream);
    mediaQuery.addEventListener("change", requestProgressUpdate);
    mediaQuery.addEventListener("change", measureStream);
    const resizeObserver = "ResizeObserver" in window ? new ResizeObserver(measureStream) : null;
    if (resizeObserver && sectionRef.current) resizeObserver.observe(sectionRef.current);
    if (resizeObserver && stickyViewportRef.current) resizeObserver.observe(stickyViewportRef.current);
    if (resizeObserver) {
      if (streamViewportRef.current) resizeObserver.observe(streamViewportRef.current);
      if (streamRef.current) resizeObserver.observe(streamRef.current);
    }
    measureFrame = window.requestAnimationFrame(measureAfterLayout);
    return () => {
      window.removeEventListener("scroll", requestProgressUpdate);
      window.removeEventListener("resize", requestProgressUpdate);
      window.removeEventListener("resize", measureStream);
      mediaQuery.removeEventListener("change", requestProgressUpdate);
      mediaQuery.removeEventListener("change", measureStream);
      resizeObserver?.disconnect();
      window.cancelAnimationFrame(measureFrame);
      window.cancelAnimationFrame(followUpMeasureFrame);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [contentKey, count, sectionRef, stickyViewportRef, streamViewportRef, streamRef]);

  return { activeIndex, streamOffset, streamTravel };
}

function PublicationTimeline({ groups, t, activeIndex, streamViewportRef, streamRef, streamOffset, scrollProgress }: { groups: [number, PublicationProject[]][]; t: (key: string) => string; activeIndex: number; streamViewportRef: RefObject<HTMLDivElement | null>; streamRef: RefObject<HTMLDivElement | null>; streamOffset: number; scrollProgress: number }) {
  const entries = useMemo(() => groups.flatMap(([, items]) => items.map((publication) => ({ id: publication._id, publication }))), [groups]);
  const indexById = useMemo(() => new Map(entries.map((entry, index) => [entry.id, index])), [entries]);

  return <>
    <div className="flex justify-end lg:hidden"><MaritimeShip className="h-9 w-20" /></div>
    <div ref={streamViewportRef} className="publications-stream-viewport relative mt-8 hidden min-h-0 flex-1 overflow-hidden lg:flex">
      <div className="pointer-events-none absolute right-1 z-10 hidden -translate-y-1/2 lg:block" style={{ top: `${scrollProgress * 100}%` }}><MaritimeShip className="h-10 w-20" /></div>
      <div ref={streamRef} style={{ transform: `translate3d(0, -${streamOffset}px, 0)` }} className="relative w-full will-change-transform motion-reduce:transform-none">
        <div className="relative pl-10 sm:pl-14"><div className="absolute bottom-0 left-3 top-1 w-px bg-[var(--border)]" />{groups.map(([year, items]) => <section key={year} className="relative mb-10 last:mb-0"><div className="relative mb-5"><span className="absolute -left-[2.15rem] top-1.5 h-3 w-3 border-2 border-[var(--rams-red)] bg-[var(--background-light)]" /><h2 className="font-display text-lg font-semibold tracking-[0.03em] text-[var(--navy)]">{year}</h2></div><div className="space-y-5">{items.map((publication) => { const index = indexById.get(publication._id) ?? 0; return <div key={publication._id} className="group relative"><span className={`absolute -left-[2.2rem] top-8 border-2 bg-[var(--background-light)] transition-[height,width,border-color] duration-300 motion-reduce:transition-none ${index === activeIndex ? "h-4 w-4 border-[var(--rams-red)]" : "h-3 w-3 border-[var(--ais-blue)] group-hover:border-[var(--rams-red)]"}`} /><PublicationCard project={publication} t={t} active={index === activeIndex} /></div>; })}</div></section>)}</div>
      </div>
    </div>
    <div className="relative mt-8 pl-10 sm:pl-14 lg:hidden"><div className="absolute bottom-0 left-3 top-1 w-px bg-[var(--border)]" />{groups.map(([year, items]) => <section key={year} className="relative mb-10 last:mb-0"><div className="relative mb-5"><span className="absolute -left-[2.15rem] top-1.5 h-3 w-3 border-2 border-[var(--rams-red)] bg-[var(--background-light)]" /><h2 className="font-display text-lg font-semibold tracking-[0.03em] text-[var(--navy)]">{year}</h2></div><div className="space-y-5">{items.map((publication) => <div key={publication._id} className="group relative"><span className="absolute -left-[2.15rem] top-8 h-3 w-3 border-2 border-[var(--ais-blue)] bg-[var(--background-light)]" /><PublicationCard project={publication} t={t} active staged={false} /></div>)}</div></section>)}</div>
  </>;
}

export default function Publications() {
  const t = useTranslations("publications");
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryString = searchParams.toString();
  const [records, setRecords] = useState<PublicationProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const stickySectionRef = useRef<HTMLDivElement>(null);
  const stickyViewportRef = useRef<HTMLDivElement>(null);
  const streamViewportRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<HTMLDivElement>(null);

  const filters = useMemo(() => readFilters(new URLSearchParams(queryString)), [queryString]);
  const [searchInput, setSearchInput] = useState(filters.search);
  const searchUrlValue = useRef(filters.search);
  const debouncedSearch = useDebouncedValue(searchInput, 300);

  useEffect(() => {
    if (filters.search === searchUrlValue.current) return;
    searchUrlValue.current = filters.search;
    setSearchInput(filters.search);
  }, [filters.search]);

  const load = useCallback(() => {
    setLoading(true);
    setError(false);
    getPublications({ limit: 100 }).then((items) => setRecords(items)).catch(() => setError(true)).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    let active = true;
    getPublications({ limit: 100 }).then((items) => { if (active) setRecords(items); }).catch(() => { if (active) setError(true); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const updateFilters = (next: Partial<PublicationFilters>) => {
    const updated = { ...filters, search: searchInput, ...next };
    const query = writeFilters(updated);
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  const clearFilters = () => {
    setSearchInput("");
    router.replace(pathname, { scroll: false });
  };

  const visibleFilters = useMemo(() => ({ ...filters, search: debouncedSearch }), [debouncedSearch, filters]);

  const years = useMemo(() => unique(records.map((record) => String(record.year))).map(Number).sort((a, b) => b - a), [records]);
  const topicOptions = useMemo(() => unique(records.flatMap((record) => record.topics)).map((value) => ({ value, label: value })), [records]);
  const methodOptions = useMemo(() => unique(records.flatMap((record) => record.methods)), [records]);

  const visibleRecords = useMemo(() => {
    const query = visibleFilters.search.trim().toLowerCase();
    return records.filter((record) => {
      const searchable = [record.title, ...record.authors, record.journal, ...record.topics, ...record.methods, record.doi ?? ""].filter(Boolean).join(" ").toLowerCase();
      const textMatch = !query || searchable.includes(query);
      const yearMatch = !visibleFilters.year || String(record.year) === visibleFilters.year;
      const topicMatch = !visibleFilters.topics.length || visibleFilters.topics.every((topic) => record.topics.includes(topic));
      const methodMatch = !visibleFilters.methods.length || visibleFilters.methods.every((method) => record.methods.includes(method));
      return textMatch && yearMatch && topicMatch && methodMatch;
    }).sort((a, b) => {
      const yearDifference = visibleFilters.sort === "newest" ? b.year - a.year : a.year - b.year;
      return yearDifference || a.title.localeCompare(b.title);
    });
  }, [records, visibleFilters]);

  const groups = useMemo(() => {
    const grouped = new Map<number, PublicationProject[]>();
    visibleRecords.forEach((record) => grouped.set(record.year, [...(grouped.get(record.year) ?? []), record]));
    return Array.from(grouped.entries()).sort(([a], [b]) => visibleFilters.sort === "newest" ? b - a : a - b);
  }, [visibleFilters.sort, visibleRecords]);
  const publicationContentKey = `${visibleFilters.sort}:${visibleRecords.map((record) => record._id).join(",")}`;
  const { activeIndex, streamOffset, streamTravel } = useStickyPublicationProgress(stickySectionRef, stickyViewportRef, streamViewportRef, streamRef, publicationContentKey, visibleRecords.length);
  const publicationScrollProgress = streamTravel > 0 ? Math.min(1, streamOffset / streamTravel) : 0;
  const stickyStyle = visibleRecords.length ? { "--publication-stream-travel": `${streamTravel}px` } as CSSProperties : undefined;

  return <section className="bg-[var(--background-light)]">
    <PublicContainer className="py-12 sm:py-16 lg:py-20">
      <header className="max-w-3xl border-b border-[var(--border)] pb-10">
        <p className="eyebrow">{t("heroEyebrow")}</p>
        <h1 className="mt-4 font-display text-4xl font-semibold leading-tight tracking-[-0.04em] text-[var(--navy)] sm:text-5xl">{t("heroTitle")}</h1>
        <p className="mt-5 max-w-2xl text-base leading-7 text-[var(--slate)] sm:text-lg">{t("heroDescription")}</p>
      </header>

      <div ref={stickySectionRef} style={stickyStyle} className={visibleRecords.length ? "publications-scroll-track relative" : ""}>
        <div ref={stickyViewportRef} className={visibleRecords.length ? "publications-sticky-viewport lg:sticky lg:top-20 lg:h-[calc(100vh-5rem)] lg:overflow-hidden" : ""}>
          <div className="publications-sticky-grid pt-10 lg:grid lg:h-[calc(100vh-5rem)] lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-14">
        <div className="lg:hidden"><button type="button" onClick={() => setMobileFiltersOpen(true)} className="flex w-full items-center justify-between border border-[var(--border)] bg-white px-4 py-3 text-sm font-semibold text-[var(--navy)] focus:outline-none focus:ring-2 focus:ring-[var(--rams-red)]/25"><span>{t("filterPublications")}</span><span aria-hidden="true">＋</span></button></div>

        <aside className="hidden border-r border-[var(--border)] pr-8 lg:block" aria-label={t("filterPublications")}>
          <PublicationFiltersPanel filters={visibleFilters} years={years} topics={topicOptions} methods={methodOptions} t={t} onChange={updateFilters} onClear={clearFilters} prefix="desktop" />
        </aside>

        <main className="mt-8 min-w-0 lg:mt-0 lg:flex lg:h-full lg:min-h-0 lg:flex-col">
          <div className="flex flex-col gap-4 border-b border-[var(--border)] pb-5 sm:flex-row sm:items-end sm:justify-between">
            <p className="font-display text-xl font-semibold text-[var(--navy)]">{t("resultCount", { count: visibleRecords.length })}</p>
            <label className="flex items-center gap-3 text-sm text-[var(--gray)]">{t("sort")}<select value={filters.sort} onChange={(event) => updateFilters({ sort: event.target.value as SortOrder })} className="border-0 border-b border-[var(--border)] bg-transparent py-1 pl-1 pr-7 text-sm font-semibold text-[var(--navy)] outline-none focus:border-[var(--rams-red)]"><option value="newest">{t("newestFirst")}</option><option value="oldest">{t("oldestFirst")}</option></select></label>
          </div>

          <label htmlFor="publication-search" className="sr-only">{t("search")}</label>
          <input id="publication-search" type="search" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder={t("searchPlaceholder")} className="mt-6 w-full border border-[var(--border)] bg-white px-4 py-3 text-sm text-[var(--navy)] outline-none placeholder:text-[var(--gray)] focus:border-[var(--rams-red)] focus:ring-2 focus:ring-[var(--rams-red)]/15" />

          {loading ? <div className="mt-8"><PublicLoading label={t("loading")} /></div> : error ? <div className="mt-8"><PublicError message={t("error")} onRetry={load} /></div> : visibleRecords.length === 0 ? <div className="mt-8 border border-dashed border-[var(--border)] bg-white p-10 text-center"><p className="eyebrow text-[var(--ais-blue)]">{t("emptyEyebrow")}</p><h2 className="mt-3 font-display text-2xl font-semibold text-[var(--navy)]">{t("emptyTitle")}</h2><p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[var(--slate)]">{t("emptyDescription")}</p>{isActive(visibleFilters) && <button type="button" onClick={clearFilters} className="mt-6 text-sm font-semibold text-[var(--rams-red)] underline underline-offset-4">{t("clearAll")}</button>}</div> : <PublicationTimeline groups={groups} t={t} activeIndex={activeIndex} streamViewportRef={streamViewportRef} streamRef={streamRef} streamOffset={streamOffset} scrollProgress={publicationScrollProgress} />}
        </main>
          </div>
        </div>
      </div>
    </PublicContainer>

    {mobileFiltersOpen && <div className="fixed inset-0 z-[70] lg:hidden" role="presentation"><button type="button" aria-label={t("closeFilters")} onClick={() => setMobileFiltersOpen(false)} className="absolute inset-0 bg-[var(--navy)]/35" /><aside role="dialog" aria-modal="true" aria-labelledby="mobile-publication-filters-title" className="absolute inset-y-0 right-0 w-[min(90vw,24rem)] overflow-y-auto bg-[var(--background-light)] p-6 shadow-[-12px_0_30px_rgba(11,32,56,0.12)]"><div className="flex items-center justify-between border-b border-[var(--border)] pb-5"><h2 id="mobile-publication-filters-title" className="font-display text-xl font-semibold text-[var(--navy)]">{t("filterPublications")}</h2><button type="button" onClick={() => setMobileFiltersOpen(false)} className="text-2xl leading-none text-[var(--gray)] focus:outline-none focus:ring-2 focus:ring-[var(--rams-red)]/25" aria-label={t("closeFilters")}>×</button></div><div className="py-7"><PublicationFiltersPanel filters={visibleFilters} years={years} topics={topicOptions} methods={methodOptions} t={t} onChange={updateFilters} onClear={clearFilters} prefix="mobile" /></div><div className="sticky bottom-0 -mx-6 border-t border-[var(--border)] bg-[var(--background-light)] px-6 pt-4"><button type="button" onClick={() => setMobileFiltersOpen(false)} className="w-full bg-[var(--navy)] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[var(--rams-red)]">{t("apply")}</button></div></aside></div>}
  </section>;
}
