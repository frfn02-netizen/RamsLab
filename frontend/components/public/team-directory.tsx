"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { formatAlumniClassLabel } from "@/lib/alumni-label";
import { getPublicPeopleList } from "@/lib/api/modules";
import type { PublicPeopleResponse, PublicPerson } from "@/types/people";
import PublicContainer from "./public-container";
import RevealOnScroll from "./reveal-on-scroll";

type PeopleTab =
  "DOSEN" | "STUDENTS" | "UNDERGRADUATE" | "INTERNSHIP" | "ALUMNI";

const categoryOrder: PeopleTab[] = [
  "DOSEN",
  "STUDENTS",
  "UNDERGRADUATE",
  "INTERNSHIP",
  "ALUMNI",
];

const graduateStudentCategories: Array<{
  key: "MAHASISWA" | "MASTER";
}> = [{ key: "MAHASISWA" }, { key: "MASTER" }];

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function searchableText(member: PublicPerson) {
  return [
    member.fullName,
    member.title,
    member.position,
    member.faculty,
    member.department,
    member.program,
    member.location,
    ...member.specialization,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function filterMembers(members: PublicPerson[], keyword: string) {
  if (!keyword) return members;
  return members.filter((member) => searchableText(member).includes(keyword));
}

export function ProfilePhoto({
  name,
  photo,
  sizes,
  aspectClassName = "aspect-[4/3]",
  variant = "default",
}: {
  name: string;
  photo?: string;
  sizes: string;
  aspectClassName?: string;
  variant?: "default" | "card";
}) {
  const [imageFailed, setImageFailed] = useState(false);

  if (variant === "card") {
    return (
      <div className="relative aspect-square w-full shrink-0 overflow-hidden rounded-md bg-stone-100">
        {photo && !imageFailed ? (
          <Image
            src={photo}
            alt={name}
            fill
            sizes={sizes}
            onError={() => setImageFailed(true)}
            className="h-full w-full object-cover object-top transition-opacity duration-200 group-hover:opacity-90"
          />
        ) : (
          <div
            className="grid h-full w-full place-items-center bg-stone-100 text-stone-500"
            aria-label={`${name} avatar`}
          >
            <span className="text-xl font-semibold">{getInitials(name)}</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={`relative w-full overflow-hidden bg-[var(--navy)] ${aspectClassName}`}
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

export function MemberCard({
  member,
  roleFallback,
}: {
  member: PublicPerson;
  roleFallback: string;
}) {
  const alumniT = useTranslations("alumni");
  const isAlumni = member.category === "ALUMNI";
  const classOfLabel = isAlumni
    ? formatAlumniClassLabel(member, alumniT("classOf"))
    : null;
  const href = isAlumni ? `/alumni/${member.id}` : `/team/${member.id}`;
  const alumniRole = isAlumni ? member.position || member.title || null : null;
  const role = isAlumni
    ? alumniRole || classOfLabel || roleFallback
    : [member.title, member.position].filter(Boolean).join(" · ") ||
      roleFallback;
  const focus = (
    isAlumni
      ? [
          alumniRole ? classOfLabel : null,
          member.specialization[0],
          member.program,
          member.location,
        ]
      : member.specialization
  ).filter(Boolean);

  return (
    <article className="group flex min-w-0 flex-col items-center text-center">
      <Link
        href={href}
        aria-label={member.fullName}
        className="flex w-full flex-1 flex-col items-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700"
      >
        <ProfilePhoto
          variant="card"
          name={member.fullName}
          photo={member.photo}
          sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 20vw"
        />

        <h3 className="mt-3 text-sm font-bold leading-snug text-stone-900 transition-colors group-hover:text-red-700">
          {member.fullName}
        </h3>

        <p className="mt-1 text-[10px] font-semibold uppercase leading-snug tracking-wider text-red-700">
          {role}
        </p>

        {focus.length > 0 ? (
          <p className="mt-1.5 text-[11px] leading-relaxed text-stone-500">
            {focus.join(" · ")}
          </p>
        ) : null}
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
    <RevealOnScroll
      className="grid grid-cols-1 gap-x-6 gap-y-8 pt-8 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5"
      stagger={60}
    >
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
        className="grid grid-cols-1 gap-x-6 gap-y-8 pt-8 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5"
        aria-hidden="true"
      >
        {Array.from({ length: 10 }).map((_, index) => (
          <div key={index} className="flex flex-col items-center">
            <div className="skeleton aspect-[4/5] w-full rounded-md" />
            <div className="mt-3 w-full space-y-2">
              <div className="skeleton mx-auto h-3.5 w-3/4 rounded" />
              <div className="skeleton mx-auto h-2.5 w-1/2 rounded" />
              <div className="skeleton mx-auto h-2.5 w-2/3 rounded" />
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
    <div className="rounded-xl border border-dashed border-stone-200 bg-white px-6 py-12 text-center">
      <h3 className="text-base font-semibold text-stone-900">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-stone-500">
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
      className="rounded-xl border border-stone-200 bg-white px-6 py-10 text-center"
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-red-700">
        {eyebrow}
      </p>
      <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-stone-600">
        {message}
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-5 inline-flex min-h-11 items-center justify-center rounded-full bg-red-700 px-5 text-sm font-semibold text-white transition-colors hover:bg-red-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700"
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
    return filterMembers(source, keyword);
  }, [activeCategory, people, keyword]);

  const graduateGroups = graduateStudentCategories.map(({ key }) => ({
    key,
    label: t(`graduateGroups.${key}`),
    members: filterMembers(people[key], keyword),
  }));

  const hasGraduateResults = graduateGroups.some(
    (group) => group.members.length > 0,
  );
  const hasFilters = keyword.length > 0;
  const emptyTitle = hasFilters ? t("noResultsTitle") : t("noProfilesTitle");
  const emptyDescription = hasFilters
    ? t("noResultsDescription")
    : t("noProfilesDescription");

  function selectCategory(category: PeopleTab) {
    setActiveCategory(category);
    setSearch("");
  }

  return (
    <section
      id="people-directory"
      className="team-page scroll-mt-24 bg-stone-50 pb-16 sm:pb-20 lg:pb-24"
    >
      <PublicContainer>
        <div className="flex flex-col gap-4 border-y border-stone-200 py-3.5 md:flex-row md:items-center md:justify-between">
          <nav
            aria-label={t("categoriesLabel")}
            className="hide-scrollbar -mx-1 overflow-x-auto px-1"
          >
            <div className="flex w-max items-center gap-1">
              {categoryOrder.map((category) => {
                const isActive = activeCategory === category;
                return (
                  <button
                    key={category}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => selectCategory(category)}
                    className={`inline-flex min-h-11 items-center rounded-full py-1.5 text-xs transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700 ${
                      isActive
                        ? "bg-red-700 px-4 font-semibold text-white"
                        : "px-3 font-medium text-stone-600 hover:text-stone-900"
                    }`}
                  >
                    {t(`categories.${category}`)}
                  </button>
                );
              })}
            </div>
          </nav>

          <div className="relative w-full md:w-[260px] md:shrink-0">
            <label htmlFor="people-search" className="sr-only">
              {t("searchLabel")}
            </label>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-stone-500"
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
              className="h-11 w-full rounded-full border border-stone-200 bg-white pl-9 pr-4 text-xs text-stone-900 outline-none transition placeholder:text-stone-500 focus:border-red-700 focus:ring-2 focus:ring-red-700/20"
            />
          </div>
        </div>

        <div aria-live="polite">
          {loading ? <DirectorySkeleton label={t("loading")} /> : null}

          {!loading && error ? (
            <div className="pt-8">
              <DirectoryError
                message={t("error")}
                eyebrow={common("requestUnavailable")}
                retryLabel={common("tryAgain")}
                onRetry={reload}
              />
            </div>
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
                      className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-500"
                    >
                      {group.label}
                    </h3>
                    {group.members.length > 0 ? (
                      <ProfileGrid
                        members={group.members}
                        roleFallback={t("roleFallback")}
                      />
                    ) : (
                      <p className="pt-8 text-sm leading-6 text-stone-500">
                        {t("studentGroupEmpty")}
                      </p>
                    )}
                  </section>
                ))}
              </div>
            ) : (
              <div className="pt-8">
                <DirectoryEmpty
                  title={emptyTitle}
                  description={emptyDescription}
                />
              </div>
            )
          ) : null}

          {!loading && !error && activeCategory !== "STUDENTS" ? (
            filteredMembers.length > 0 ? (
              <ProfileGrid
                members={filteredMembers}
                roleFallback={t("roleFallback")}
              />
            ) : (
              <div className="pt-8">
                <DirectoryEmpty
                  title={emptyTitle}
                  description={emptyDescription}
                />
              </div>
            )
          ) : null}
        </div>
      </PublicContainer>
    </section>
  );
}
