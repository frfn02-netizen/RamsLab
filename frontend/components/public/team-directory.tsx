"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { formatAlumniClassLabel } from "@/lib/alumni-label";
import { getPublicPeopleList } from "@/lib/api/modules";
import type { PublicPeopleResponse, PublicPerson } from "@/types/people";
import CustomSelect from "@/components/ui/custom-select";
import PublicContainer from "./public-container";
import RevealOnScroll from "./reveal-on-scroll";

type PeopleTab =
  "DOSEN" | "STUDENTS" | "UNDERGRADUATE" | "INTERNSHIP" | "ALUMNI";

type AreaFilter =
  | "all"
  | "reliability"
  | "safety"
  | "maintenance"
  | "maritime"
  | "ais"
  | "simulation";

type SortOrder = "default" | "name";

const categoryOrder: PeopleTab[] = [
  "DOSEN",
  "STUDENTS",
  "UNDERGRADUATE",
  "INTERNSHIP",
  "ALUMNI",
];

const AREA_FILTERS: Array<{
  key: AreaFilter;
  labelKey: string;
  tokens: string[];
}> = [
  { key: "all", labelKey: "filterAll", tokens: [] },
  {
    key: "reliability",
    labelKey: "filterReliability",
    tokens: ["reliability", "reliable", "keandalan"],
  },
  {
    key: "safety",
    labelKey: "filterSafety",
    tokens: ["safety", "keselamatan"],
  },
  {
    key: "maintenance",
    labelKey: "filterMaintenance",
    tokens: ["maintenance", "pemeliharaan", "perawatan"],
  },
  {
    key: "maritime",
    labelKey: "filterMaritime",
    tokens: ["maritime", "marine", "maritim", "kelautan"],
  },
  { key: "ais", labelKey: "filterAis", tokens: ["ais"] },
  {
    key: "simulation",
    labelKey: "filterSimulation",
    tokens: ["simulation", "simulasi"],
  },
];

const AREA_TOKENS: Record<AreaFilter, string[]> = AREA_FILTERS.reduce(
  (tokens, filter) => {
    tokens[filter.key] = filter.tokens;
    return tokens;
  },
  {} as Record<AreaFilter, string[]>,
);

const graduateStudentCategories: Array<{
  key: "MAHASISWA" | "MASTER";
}> = [{ key: "MAHASISWA" }, { key: "MASTER" }];

const PROFILE_GRID_CLASS =
  "grid grid-cols-1 auto-rows-fr gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4";

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function CategoryIcon({ category }: { category: PeopleTab }) {
  const iconProps = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    className: "h-4 w-4",
    "aria-hidden": true,
  } as const;

  if (category === "DOSEN") {
    return (
      <svg {...iconProps}>
        <path d="M22 10 12 5 2 10l10 5 10-5Z" />
        <path d="M6 12v5c0 1.7 2.7 3 6 3s6-1.3 6-3v-5" />
      </svg>
    );
  }
  if (category === "STUDENTS") {
    return (
      <svg {...iconProps}>
        <path d="M9 3h6" />
        <path d="M10 3v5.5L5.5 17a2.2 2.2 0 0 0 2 3h9a2.2 2.2 0 0 0 2-3L14 8.5V3" />
        <path d="M7.5 14h9" />
      </svg>
    );
  }
  if (category === "UNDERGRADUATE") {
    return (
      <svg {...iconProps}>
        <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5V5.5Z" />
        <path d="M4 18.5A2.5 2.5 0 0 1 6.5 16H20" />
      </svg>
    );
  }
  if (category === "INTERNSHIP") {
    return (
      <svg {...iconProps}>
        <rect x="3" y="7" width="18" height="13" rx="2" />
        <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        <path d="M3 12h18" />
        <path d="M10 12v2h4v-2" />
      </svg>
    );
  }
  return (
    <svg {...iconProps}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function searchableText(member: PublicPerson) {
  return [
    member.fullName,
    member.title,
    member.position,
    member.faculty,
    member.department,
    ...member.specialization,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function matchesArea(member: PublicPerson, area: AreaFilter) {
  const tokens = AREA_TOKENS[area];
  if (tokens.length === 0) return true;
  return member.specialization.some((tag) => {
    const value = tag.toLowerCase();
    return tokens.some((token) => value.includes(token));
  });
}

function applyFilters(
  members: PublicPerson[],
  keyword: string,
  area: AreaFilter,
  sortOrder: SortOrder,
) {
  const filtered = members.filter((member) => {
    if (!matchesArea(member, area)) return false;
    if (!keyword) return true;
    return searchableText(member).includes(keyword);
  });

  if (sortOrder === "name") {
    return [...filtered].sort((a, b) =>
      a.fullName.localeCompare(b.fullName, undefined, { sensitivity: "base" }),
    );
  }

  return filtered;
}

export function ProfilePhoto({
  name,
  photo,
  sizes,
  aspectClassName = "aspect-[4/3]",
}: {
  name: string;
  photo?: string;
  sizes: string;
  aspectClassName?: string;
}) {
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <div
      className={`relative ${aspectClassName} overflow-hidden bg-[var(--navy)]`}
    >
      {photo && !imageFailed ? (
        <Image
          src={photo}
          alt={name}
          fill
          sizes={sizes}
          onError={() => setImageFailed(true)}
          className="public-image-zoom object-cover object-[center_24%]"
        />
      ) : (
        <div
          className="grid h-full place-items-center bg-[var(--navy)] text-white"
          aria-label={`${name} avatar`}
        >
          <span className="font-display text-4xl font-semibold tracking-[-0.04em] text-white/85 sm:text-5xl">
            {getInitials(name)}
          </span>
        </div>
      )}
    </div>
  );
}

export function RoleLine({
  member,
  showClassOf = true,
}: {
  member: PublicPerson;
  fallback: string;
  showClassOf?: boolean;
}) {
  const t = useTranslations("alumni");
  const role = [member.title, member.position].filter(Boolean).join(" · ");
  const classOfLabel = showClassOf
    ? formatAlumniClassLabel(member, t("classOf"))
    : null;
  if (!role) return null;
  return (
    <p className="mt-2 font-mono text-[0.75rem] uppercase tracking-[0.08em] text-[var(--team-blue)]">
      {classOfLabel ? `${role} · ${classOfLabel}` : role}
    </p>
  );
}

function ExpertiseTags({ tags }: { tags: string[] }) {
  if (tags.length === 0) return null;
  return (
    <ul className="mt-2 flex flex-wrap gap-1.5">
      {tags.map((tag) => (
        <li
          key={tag}
          className="rounded-[4px] border border-[var(--team-border)] bg-[var(--team-bg-soft)] px-2 py-0.5 text-[0.75rem] leading-4 text-[var(--team-text)]"
        >
          {tag}
        </li>
      ))}
    </ul>
  );
}

export function MemberCard({
  member,
  roleFallback,
}: {
  member: PublicPerson;
  roleFallback: string;
}) {
  const t = useTranslations("team");
  const alumniT = useTranslations("alumni");
  const isAlumni = member.category === "ALUMNI";
  const classOfLabel = isAlumni
    ? formatAlumniClassLabel(member, alumniT("classOf"))
    : null;
  const tags = member.specialization.filter(Boolean).slice(0, 3);
  const badge = t(`roleBadges.${member.category}`);
  const href = isAlumni ? `/alumni/${member.id}` : `/team/${member.id}`;

  return (
    <article className="group flex h-full min-w-0 overflow-hidden rounded-[10px] border border-[var(--team-border)] bg-white shadow-[0_1px_2px_rgba(20,42,69,0.04)] transition-[border-color,box-shadow] duration-200 hover:border-[rgba(40,120,199,0.45)] hover:shadow-[0_12px_30px_rgba(20,42,69,0.09)]">
      <Link
        href={href}
        aria-label={member.fullName}
        className="flex h-full min-h-[168px] w-full min-w-0 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--team-blue)] active:opacity-95"
      >
        <div className="relative w-[104px] shrink-0 self-stretch overflow-hidden bg-[var(--team-navy)] sm:w-[124px] lg:w-[132px]">
          <ProfilePhoto
            name={member.fullName}
            photo={member.photo}
            sizes="(max-width: 640px) 104px, (max-width: 1024px) 124px, 132px"
            aspectClassName="h-full w-full"
          />
        </div>

        <div className="flex min-w-0 flex-1 flex-col p-4 sm:p-5">
          <span className="inline-flex w-fit items-center rounded-[4px] border border-[var(--team-border)] bg-[var(--team-bg-soft)] px-2 py-0.5 text-[0.75rem] font-bold uppercase tracking-[0.12em] text-[var(--team-blue)]">
            {badge}
          </span>

          <h3 className="mt-2.5 font-display text-[1.2rem] font-semibold leading-[1.22] tracking-[-0.02em] text-[var(--team-navy)] transition-colors group-hover:text-[var(--team-blue)]">
            {member.fullName}
          </h3>

          <RoleLine
            member={member}
            fallback={roleFallback}
            showClassOf={!isAlumni}
          />
          <ExpertiseTags tags={tags} />

          {isAlumni && classOfLabel && (
            <p className="mt-2.5 text-[0.75rem] font-semibold uppercase tracking-[0.08em] text-[var(--team-blue)]">
              {classOfLabel}
            </p>
          )}
          {isAlumni && member.program && (
            <p className="mt-0.5 text-xs leading-5 text-[var(--team-muted)]">
              {member.program}
            </p>
          )}
          {isAlumni && member.location && (
            <p className="mt-0.5 text-xs leading-5 text-[var(--team-muted)]">
              {member.location}
            </p>
          )}

          <span className="mt-auto inline-flex items-center gap-1 pt-3 text-[0.76rem] font-semibold text-[var(--team-blue)] transition-colors group-hover:text-[var(--team-navy)]">
            {t("profileLink")}
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-3.5 w-3.5"
              aria-hidden="true"
            >
              <path d="M5 12h14" />
              <path d="m13 6 6 6-6 6" />
            </svg>
          </span>
        </div>
      </Link>
    </article>
  );
}

function ProfileGrid({
  members,
  roleFallback,
}: {
  members: PublicPerson[];
  roleFallback: string;
}) {
  return (
    <RevealOnScroll className={PROFILE_GRID_CLASS} stagger={60}>
      {members.map((member) => (
        <MemberCard
          key={member.id}
          member={member}
          roleFallback={roleFallback}
        />
      ))}
    </RevealOnScroll>
  );
}

function DirectorySkeleton({ label }: { label: string }) {
  return (
    <div role="status" aria-label={label}>
      <span className="sr-only">{label}</span>
      <div
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4"
        aria-hidden="true"
      >
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="flex min-h-[168px] overflow-hidden rounded-[10px] border border-[var(--team-border)] bg-white"
          >
            <div className="skeleton w-[104px] shrink-0 sm:w-[124px] lg:w-[132px]" />
            <div className="min-w-0 flex-1 space-y-3 p-4 sm:p-5">
              <div className="skeleton h-3 w-16 rounded-[3px]" />
              <div className="skeleton h-4 w-3/4 rounded-[3px]" />
              <div className="skeleton h-3 w-1/2 rounded-[3px]" />
              <div className="flex gap-2">
                <div className="skeleton h-4 w-14 rounded-[3px]" />
                <div className="skeleton h-4 w-12 rounded-[3px]" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DirectoryEmpty({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-[10px] border border-dashed border-[var(--team-border)] bg-white px-6 py-12 text-center">
      <h3 className="font-display text-xl font-semibold text-[var(--team-navy)]">
        {title}
      </h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--team-muted)]">
        {description}
      </p>
    </div>
  );
}

function DirectoryError({
  message,
  eyebrow,
  retryLabel,
  onRetry,
}: {
  message: string;
  eyebrow: string;
  retryLabel: string;
  onRetry: () => void;
}) {
  return (
    <div
      role="alert"
      className="rounded-[10px] border border-[var(--team-border)] bg-white px-6 py-10 text-center"
    >
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--team-blue)]">
        {eyebrow}
      </p>
      <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[var(--team-text)]">
        {message}
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-5 inline-flex min-h-11 items-center justify-center rounded-[6px] bg-[var(--team-navy)] px-4 text-sm font-semibold text-white transition-colors hover:bg-[var(--team-blue)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--team-blue)] active:bg-[var(--team-navy)]"
      >
        {retryLabel}
      </button>
    </div>
  );
}

export default function TeamDirectory({
  initialPeople,
  initialCategory,
}: {
  initialPeople: PublicPeopleResponse;
  initialCategory?: string;
}) {
  const t = useTranslations("team");
  const common = useTranslations("common");
  const [people, setPeople] = useState<PublicPeopleResponse>(initialPeople);
  const [activeCategory, setActiveCategory] = useState<PeopleTab>(() =>
    initialCategory && categoryOrder.includes(initialCategory as PeopleTab)
      ? (initialCategory as PeopleTab)
      : "DOSEN",
  );
  const [search, setSearch] = useState("");
  const [activeArea, setActiveArea] = useState<AreaFilter>("all");
  const [sortOrder, setSortOrder] = useState<SortOrder>("default");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    const category = new URLSearchParams(window.location.search).get(
      "category",
    );

    if (!category || !categoryOrder.includes(category as PeopleTab)) return;

    const frame = window.requestAnimationFrame(() =>
      setActiveCategory(category as PeopleTab),
    );
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (reloadToken === 0) return;

    let cancelled = false;

    getPublicPeopleList()
      .then((records) => {
        if (!cancelled) setPeople(records);
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
  }, [reloadToken]);

  const reload = useCallback(() => {
    setLoading(true);
    setError(false);
    setReloadToken((value) => value + 1);
  }, []);

  const keyword = search.trim().toLowerCase();

  const filteredMembers = useMemo(() => {
    const source =
      activeCategory === "STUDENTS"
        ? [...people.MAHASISWA, ...people.MASTER]
        : people[activeCategory];
    return applyFilters(source, keyword, activeArea, sortOrder);
  }, [activeCategory, people, keyword, activeArea, sortOrder]);

  const graduateGroups = graduateStudentCategories.map(({ key }) => ({
    key,
    label: t(`graduateGroups.${key}`),
    members: applyFilters(people[key], keyword, activeArea, sortOrder),
  }));

  const hasGraduateResults = graduateGroups.some(
    (group) => group.members.length > 0,
  );
  const hasFilters = keyword.length > 0 || activeArea !== "all";
  const emptyTitle = hasFilters ? t("noResultsTitle") : t("noProfilesTitle");
  const emptyDescription = hasFilters
    ? t("noResultsDescription")
    : t("noProfilesDescription");

  const meta = {
    eyebrow: t(`sections.${activeCategory}.eyebrow`),
    title: t(`sections.${activeCategory}.title`),
    description: t(`sections.${activeCategory}.description`),
  };

  function selectCategory(category: PeopleTab) {
    setActiveCategory(category);
    setSearch("");
    setActiveArea("all");
  }

  return (
    <section
      id="people-directory"
      className="team-page scroll-mt-24 bg-[var(--team-bg-soft)] py-12 sm:py-14 lg:py-16 min-[2000px]:py-24"
    >
      <PublicContainer>
        <nav
          aria-label={t("categoriesLabel")}
          className="hide-scrollbar -mx-1 overflow-x-auto pb-1"
        >
          <div className="mx-1 inline-flex min-w-max items-center gap-1 rounded-[8px] border border-[var(--team-border)] bg-white p-1 shadow-[0_1px_2px_rgba(20,42,69,0.04)]">
            {categoryOrder.map((category) => {
              const isActive = activeCategory === category;
              return (
                <button
                  key={category}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => selectCategory(category)}
                  className={`inline-flex min-h-11 items-center gap-2 rounded-[6px] px-3.5 text-[0.78rem] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--team-blue)] active:opacity-90 sm:px-4 ${
                    isActive
                      ? "bg-[var(--team-navy)] text-white"
                      : "text-[var(--team-text)] hover:bg-[var(--team-bg-soft)] hover:text-[var(--team-navy)]"
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={
                      isActive
                        ? "text-[var(--team-sky)]"
                        : "text-[var(--team-blue)]"
                    }
                  >
                    <CategoryIcon category={category} />
                  </span>
                  <span>{t(`categories.${category}`)}</span>
                </button>
              );
            })}
          </div>
        </nav>

        <div className="mt-10 flex flex-col gap-6 border-b border-[var(--team-border)] pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-[var(--team-blue)]">
              {meta.eyebrow}
            </p>
            <h2 className="public-section-title mt-2 text-[var(--team-navy)]">
              {meta.title}
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--team-text)] sm:text-[0.95rem]">
              {meta.description}
            </p>
          </div>

          <div className="w-full lg:max-w-[360px]">
            <label
              htmlFor="people-search"
              className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-[var(--team-muted)]"
            >
              {t("searchLabel")}
            </label>
            <div className="relative">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--team-muted)]"
                aria-hidden="true"
              >
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
              <input
                id="people-search"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t("searchPlaceholder")}
                className="min-h-11 w-full rounded-[6px] border border-[var(--team-border)] bg-white pl-10 pr-3 text-sm text-[var(--team-text)] outline-none transition placeholder:text-[var(--team-muted)] focus:border-[var(--team-blue)] focus:ring-2 focus:ring-[var(--team-blue)]/20"
              />
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-4 border-b border-[var(--team-border)] pb-5 xl:flex-row xl:items-center xl:justify-between">
          <div
            role="group"
            aria-label={t("filterLabel")}
            className="flex flex-wrap gap-2"
          >
            {AREA_FILTERS.map((filter) => {
              const isActive = activeArea === filter.key;
              return (
                <button
                  key={filter.key}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => setActiveArea(filter.key)}
                  className={`inline-flex min-h-11 items-center rounded-[5px] border px-3 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--team-blue)] active:opacity-90 ${
                    isActive
                      ? "border-[var(--team-navy)] bg-[var(--team-navy)] text-white"
                      : "border-[var(--team-border)] bg-white text-[var(--team-text)] hover:border-[var(--team-blue)] hover:text-[var(--team-blue)]"
                  }`}
                >
                  {t(filter.labelKey)}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2.5">
            <label
              htmlFor="people-sort"
              className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--team-muted)]"
            >
              {t("sortLabel")}
            </label>
            <CustomSelect
              id="people-sort"
              className="w-[190px]"
              value={sortOrder}
              onChange={(next) => setSortOrder(next as SortOrder)}
              options={[
                { value: "default", label: t("sortDefault") },
                { value: "name", label: t("sortName") },
              ]}
              triggerClassName="min-h-11 rounded-[6px] border-[var(--team-border)] px-3 font-medium"
            />
          </div>
        </div>

        <div className="mt-8" aria-live="polite">
          {loading ? <DirectorySkeleton label={t("loading")} /> : null}

          {!loading && error ? (
            <DirectoryError
              message={t("error")}
              eyebrow={common("requestUnavailable")}
              retryLabel={common("tryAgain")}
              onRetry={reload}
            />
          ) : null}

          {!loading && !error && activeCategory === "STUDENTS" ? (
            hasGraduateResults ? (
              <div className="space-y-10">
                {graduateGroups.map((group) => (
                  <section
                    key={group.key}
                    aria-labelledby={`${group.key.toLowerCase()}-heading`}
                  >
                    <h3
                      id={`${group.key.toLowerCase()}-heading`}
                      className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-[var(--team-muted)]"
                    >
                      {group.label}
                    </h3>
                    {group.members.length > 0 ? (
                      <div className="mt-4">
                        <ProfileGrid
                          members={group.members}
                          roleFallback={t("roleFallback")}
                        />
                      </div>
                    ) : (
                      <p className="mt-4 text-sm leading-6 text-[var(--team-muted)]">
                        {t("studentGroupEmpty")}
                      </p>
                    )}
                  </section>
                ))}
              </div>
            ) : (
              <DirectoryEmpty
                title={emptyTitle}
                description={emptyDescription}
              />
            )
          ) : null}

          {!loading && !error && activeCategory !== "STUDENTS" ? (
            filteredMembers.length > 0 ? (
              <ProfileGrid
                members={filteredMembers}
                roleFallback={t("roleFallback")}
              />
            ) : (
              <DirectoryEmpty
                title={emptyTitle}
                description={emptyDescription}
              />
            )
          ) : null}
        </div>
      </PublicContainer>
    </section>
  );
}
