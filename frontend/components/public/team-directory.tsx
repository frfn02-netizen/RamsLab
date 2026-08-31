"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
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
  DOSEN: "OUR LAB MEMBERS",
  MAHASISWA: "PH.D. STUDENTS",
  UNDERGRADUATE: "UNDERGRADUATE STUDENTS",
  ALUMNI: "ALUMNI",
};

const categoryOrder: PublicDirectoryCategory[] = [
  "DOSEN",
  "MAHASISWA",
  "UNDERGRADUATE",
  "ALUMNI",
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
          unoptimized
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
  const year = member.graduationYear ? ` · ${member.graduationYear}` : "";
  return (
    <p className="mt-2 font-mono text-[0.62rem] uppercase tracking-[0.1em] text-[var(--rams-red)]">
      {role ? `${role}${year}` : fallback}
    </p>
  );
}

export function ProfileLinks({
  member,
  label,
}: {
  member: PublicPerson;
  label: string;
}) {
  return (
    <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 border-t border-[var(--border)] pt-4 text-sm font-semibold">
      {member.linkedin && (
        <a
          href={member.linkedin}
          target="_blank"
          rel="noreferrer"
          className="public-card-arrow text-[var(--rams-red)]"
        >
          {label} <span aria-hidden="true">→</span>
        </a>
      )}
    </div>
  );
}

export function MemberCard({
  member,
  profileLabel,
  roleFallback,
}: {
  member: PublicPerson;
  profileLabel: string;
  roleFallback: string;
}) {
  return (
    <article className="group flex h-full min-w-0 flex-col">
      <div className="overflow-hidden border border-[var(--border)] bg-white">
        <ProfilePhoto
          name={member.fullName}
          photo={member.photo}
          sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1280px) 25vw, 20vw"
        />
      </div>
      <div className="flex flex-1 flex-col pt-5">
        <h3 className="font-display min-h-[3.25rem] text-xl font-semibold leading-tight tracking-[-0.025em] text-[var(--navy)] transition-colors group-hover:text-[var(--rams-red)]">
          {member.fullName}
        </h3>
        <RoleLine member={member} fallback={roleFallback} />
        {member.category === "ALUMNI" && (
          <div className="mt-3 space-y-1 text-sm leading-6 text-[var(--slate)]">
            <p>{member.nim ? `NIM: ${member.nim}` : "NIM not provided"}</p>
            {member.location && <p>{member.location}</p>}
          </div>
        )}
        {member.specialization.length > 0 && (
          <p className="mt-5 text-sm leading-6 text-[var(--slate)]">
            {member.specialization.join(" · ")}
          </p>
        )}
        {member.linkedin && (
          <div className="mt-auto pt-5">
            <ProfileLinks member={member} label={profileLabel} />
          </div>
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
  const [people, setPeople] = useState<PublicPeopleResponse>({
    DOSEN: [],
    MAHASISWA: [],
    UNDERGRADUATE: [],
    ALUMNI: [],
  });
  const [activeCategory, setActiveCategory] =
    useState<PublicDirectoryCategory>("DOSEN");
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

  const categoryLabel = categoryLabels[activeCategory];
  const filteredMembers = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return people[activeCategory];
    return people[activeCategory].filter((member) =>
      searchableText(member).includes(keyword),
    );
  }, [activeCategory, people, search]);
  const members = filteredMembers;

  return (
    <section className="team-directory bg-[var(--paper)]">
      <PublicContainer className="py-20 sm:py-24">
        <nav
          aria-label="People categories"
          className="flex flex-wrap gap-2 border-b border-[var(--border)] pb-4"
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
              {categoryLabels[category]}
            </button>
          ))}
        </nav>

        <div className="mt-12 flex flex-col gap-5 border-b border-[var(--border)] pb-10 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="eyebrow text-[var(--rams-red)]">{categoryLabel}</p>
            <h2
              id="people-category-heading"
              className="mt-4 font-display text-3xl font-semibold tracking-[-0.04em] text-[var(--navy)] sm:text-4xl"
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

        <div className="mt-10" aria-live="polite">
          {loading ? (
            <PublicLoading label={t("loading")} />
          ) : error ? (
            <PublicError message={t("error")} onRetry={load} />
          ) : null}

          {!loading && !error && members.length > 0 && (
            <div
              className={`${activeCategory === "DOSEN" && !search ? "mt-16 border-t border-[var(--border)] pt-12" : ""}`}
            >
              {activeCategory === "DOSEN" && !search && (
                <p className="mb-8 text-sm leading-6 text-[var(--slate)]">
                  {t("staffDescription")}
                </p>
              )}
              <RevealOnScroll
                className="grid gap-x-6 gap-y-14 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
                stagger={90}
              >
                {members.map((member) => (
                  <MemberCard
                    key={member.id}
                    member={member}
                    profileLabel={t("profileLink")}
                    roleFallback={t("roleFallback")}
                  />
                ))}
              </RevealOnScroll>
            </div>
          )}

          {!loading && !error && members.length === 0 && (
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
