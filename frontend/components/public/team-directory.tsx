"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { getPublicPeopleList } from "@/lib/api/modules";
import type {
  PublicDirectoryCategory,
  PublicPeopleResponse,
  PublicPerson,
} from "@/types/people";
import { PublicEmpty, PublicError, PublicLoading } from "./public-states";
import PublicContainer from "./public-container";
import RevealOnScroll from "./reveal-on-scroll";

const categoryLabels: Record<PublicDirectoryCategory, string> = {
  DOSEN: "LECTURERS",
  MAHASISWA: "PHD",
  MASTER: "MASTER",
  UNDERGRADUATE: "UNDERGRADUATE STUDENTS",
  INTERNSHIP: "VOCATIONAL INTERNS",
  ALUMNI: "ALUMNI",
};

const categoryOrder: Array<PublicDirectoryCategory | "STUDENTS"> = [
  "DOSEN",
  "STUDENTS",
  "UNDERGRADUATE",
  "INTERNSHIP",
  "ALUMNI",
];

const graduatedStudentCategories: Array<{
  key: "MAHASISWA" | "MASTER";
  label: string;
}> = [
  { key: "MAHASISWA", label: "PHD" },
  { key: "MASTER", label: "MASTER" },
];

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function ProfilePhoto({
  name,
  photo,
  sizes,
}: {
  name: string;
  photo?: string;
  sizes: string;
}) {
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <div className="relative aspect-[4/3] overflow-hidden bg-[var(--navy)]">
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
  fallback,
}: {
  member: PublicPerson;
  fallback: string;
}) {
  const role = [member.title, member.position].filter(Boolean).join(" · ");
  const year = member.angkatan ? ` · P${member.angkatan}` : "";
  if (!role) return null;
  return (
    <p className="mt-2 font-mono text-[0.62rem] uppercase tracking-[0.1em] text-[var(--rams-red)]">
      {`${role}${year}`}
    </p>
  );
}

export function MemberCard({
  member,
  roleFallback,
}: {
  member: PublicPerson;
  roleFallback: string;
}) {
  const isStudent = [
    "MAHASISWA",
    "MASTER",
    "UNDERGRADUATE",
    "INTERNSHIP",
  ].includes(member.category);

  const isAlumni = member.category === "ALUMNI";
  const company = isAlumni ? member.specialization[0] : undefined;

  return (
    <article className="group flex h-full min-w-0 flex-col">
      <div className="overflow-hidden border border-[var(--border)] bg-white">
        <ProfilePhoto
          name={member.fullName}
          photo={member.photo}
          sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1280px) 25vw, 20vw"
        />
      </div>
      <div className="flex flex-1 flex-col items-center pt-4 text-center">
        <h3
          className={`font-display max-w-full text-xl font-semibold leading-tight tracking-[-0.025em] text-[var(--navy)] transition-colors group-hover:text-[var(--rams-red)]`}
        >
          <Link
            href={isAlumni ? `/alumni/${member.id}` : `/team/${member.id}`}
            className="hover:text-[var(--rams-red)]"
          >
            {member.fullName}
          </Link>
          {isAlumni && member.angkatan && (
            <span className="ml-2 inline font-mono text-xl font-bold uppercase tracking-[0.08em] text-[var(--rams-red)]">
              P{member.angkatan}
            </span>
          )}
        </h3>

        {isAlumni && member.position && (
          <p className="mt-2 text-sm font-semibold leading-6 text-[var(--navy)]">
            {member.position}
          </p>
        )}

        {isAlumni && company && (
          <p className="mt-1 text-sm leading-6 text-[var(--slate)]">
            {company}
          </p>
        )}

        {!isAlumni && (!isStudent || member.category === "INTERNSHIP") && (
          <RoleLine member={member} fallback={roleFallback} />
        )}
        {!isAlumni &&
          (!isStudent || member.category === "INTERNSHIP") &&
          member.specialization.length > 0 && (
            <p className="mt-2 text-sm leading-6 text-[var(--slate)]">
              {member.specialization.join(" · ")}
            </p>
          )}
      </div>
    </article>
  );
}

function searchableText(member: PublicPerson) {
  return [
    member.fullName,
    member.title,
    member.position,
    ...member.specialization,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export default function TeamDirectory() {
  const t = useTranslations("team");
  const searchParams = useSearchParams();
  const [people, setPeople] = useState<PublicPeopleResponse>({
    DOSEN: [],
    MAHASISWA: [],
    MASTER: [],
    UNDERGRADUATE: [],
    INTERNSHIP: [],
    ALUMNI: [],
  });
  const [activeCategory, setActiveCategory] = useState<
    PublicDirectoryCategory | "STUDENTS"
  >(() => {
    const param = searchParams.get("category");
    if (
      param &&
      [...categoryOrder, "MAHASISWA", "MASTER"].includes(
        param as PublicDirectoryCategory | "STUDENTS",
      )
    ) {
      return param as PublicDirectoryCategory | "STUDENTS";
    }
    return "DOSEN";
  });
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError(false);
    getPublicPeopleList()
      .then(setPeople)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
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
  }, []);

  const categoryLabel =
    activeCategory === "STUDENTS"
      ? "GRADUATE STUDENT"
      : categoryLabels[activeCategory];
  const filteredMembers = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    const source =
      activeCategory === "STUDENTS"
        ? [...people.MAHASISWA, ...people.MASTER]
        : people[activeCategory];
    if (!keyword) return source;
    return source.filter((member) => searchableText(member).includes(keyword));
  }, [activeCategory, people, search]);
  const members = filteredMembers;

  function membersFor(category: "MAHASISWA" | "MASTER") {
    const categoryMembers = people[category];
    const keyword = search.trim().toLowerCase();
    return keyword
      ? categoryMembers.filter((member) =>
          searchableText(member).includes(keyword),
        )
      : categoryMembers;
  }

  return (
    <section className="team-directory bg-[var(--paper)]">
      <PublicContainer className="pt-6 pb-10 sm:pt-8 sm:pb-12">
        <nav
          aria-label="People categories"
          className="flex flex-wrap gap-2 border-b border-[var(--border)] pb-3"
        >
          {categoryOrder.map((category) => (
            <button
              key={category}
              type="button"
              aria-pressed={activeCategory === category}
              onClick={() => {
                setActiveCategory(category);
                setSearch("");
              }}
              className={`border px-4 py-2.5 text-xs font-bold uppercase tracking-[0.1em] transition-colors ${activeCategory === category ? "border-[var(--navy)] bg-[var(--navy)] text-white" : "border-[var(--border)] bg-white text-[var(--gray)] hover:border-[var(--rams-red)] hover:text-[var(--rams-red)]"}`}
            >
              {category === "STUDENTS"
                ? "GRADUATE STUDENT"
                : categoryLabels[category]}
            </button>
          ))}
        </nav>

        <div className="mt-5 flex flex-col gap-3 border-b border-[var(--border)] pb-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2
              id="people-category-heading"
              className="font-display text-3xl font-semibold tracking-[-0.04em] text-[var(--navy)] sm:text-4xl"
            >
              {categoryLabel}
            </h2>
          </div>
          <div className="w-full sm:max-w-xs">
            <label htmlFor="people-search" className="sr-only">
              Search people
            </label>
            <input
              id="people-search"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search people"
              className="min-h-11 w-full border border-[var(--border)] bg-white px-4 text-sm text-[var(--navy)] outline-none transition focus:border-[var(--rams-red)] focus:ring-2 focus:ring-[var(--rams-red)]/15"
            />
          </div>
        </div>

        <div className="mt-4" aria-live="polite">
          {loading ? (
            <PublicLoading label={t("loading")} />
          ) : error ? (
            <PublicError message={t("error")} onRetry={load} />
          ) : null}

          {!loading && !error && activeCategory === "STUDENTS" && (
            <div className="mt-6 space-y-8 border-t border-[var(--border)] pt-5">
              {graduatedStudentCategories.map(({ key, label }) => {
                const categoryMembers = membersFor(key);
                return (
                  <section
                    key={key}
                    aria-labelledby={`${key.toLowerCase()}-heading`}
                  >
                    <h3
                      id={`${key.toLowerCase()}-heading`}
                      className="font-display text-3xl font-semibold tracking-[-0.04em] text-[var(--navy)] sm:text-4xl"
                    >
                      {label}
                    </h3>
                    {categoryMembers.length > 0 ? (
                      <RevealOnScroll
                        className="mt-6 grid gap-x-6 gap-y-10 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
                        stagger={90}
                      >
                        {categoryMembers.map((member) => (
                          <MemberCard
                            key={member.id}
                            member={member}
                            roleFallback={t("roleFallback")}
                          />
                        ))}
                      </RevealOnScroll>
                    ) : (
                      <p className="mt-6 text-sm leading-6 text-[var(--slate)]">
                        No profiles published in this category.
                      </p>
                    )}
                  </section>
                );
              })}
            </div>
          )}

          {!loading &&
            !error &&
            activeCategory !== "STUDENTS" &&
            members.length > 0 && (
              <div
                className={`${activeCategory === "DOSEN" && !search ? "mt-6 border-t border-[var(--border)] pt-5" : ""}`}
              >
                {activeCategory === "DOSEN" && !search && (
                  <p className="mb-5 text-sm leading-6 text-[var(--slate)]">
                    {t("staffDescription")}
                  </p>
                )}
                <RevealOnScroll
                  className="grid gap-x-6 gap-y-10 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
                  stagger={90}
                >
                  {members.map((member) => (
                    <MemberCard
                      key={member.id}
                      member={member}
                      roleFallback={t("roleFallback")}
                    />
                  ))}
                </RevealOnScroll>
              </div>
            )}

          {!loading &&
            !error &&
            activeCategory !== "STUDENTS" &&
            members.length === 0 && (
              <PublicEmpty
                title="No profiles published"
                description="Profiles in this category will appear here when available."
              />
            )}
        </div>
      </PublicContainer>
    </section>
  );
}
