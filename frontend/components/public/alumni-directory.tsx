"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { getPublicAlumniList } from "@/lib/api/modules";
import type { PublicPerson } from "@/types/people";
import PublicContainer from "./public-container";
import { PublicEmpty, PublicError, PublicLoading } from "./public-states";
import RevealOnScroll from "./reveal-on-scroll";
import { ProfilePhoto } from "./team-directory";

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

export function AlumniCard({ member }: { member: PublicPerson }) {
  const t = useTranslations("alumni");
  const company = member.specialization[0];

  return (
    <article className="group flex h-full min-w-0 flex-col text-center">
      <div className="mx-auto w-full overflow-hidden border border-[var(--border)] bg-white">
        <ProfilePhoto
          name={member.fullName}
          photo={member.photo}
          sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, (max-width: 1280px) 25vw, 20vw"
        />
      </div>

      <h3 className="mx-auto mt-5 line-clamp-2 min-h-[3.25rem] max-w-full font-display text-xl font-semibold leading-tight tracking-[-0.025em] text-[var(--navy)]">
        <Link
          href={`/alumni/${member.id}`}
          className="hover:text-[var(--rams-red)]"
        >
          <span className="transition-colors group-hover:text-[var(--rams-red)]">
            {member.fullName}
          </span>
        </Link>
      </h3>

      {member.angkatan && (
        <p className="mx-auto mt-2 font-mono text-sm font-bold uppercase tracking-[0.08em] text-[var(--rams-red)]">
          {t("classOf")} P{member.angkatan}
        </p>
      )}

      <div className="mx-auto mt-4 max-w-full space-y-1 text-sm leading-6 text-[var(--slate)]">
        {member.position && (
          <p className="font-semibold text-[var(--navy)]">{member.position}</p>
        )}

        {company && <p>{company}</p>}

        {member.linkedin && (
          <p className="mt-2">
            <a
              href={member.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--rams-red)] hover:text-[var(--navy)]"
            >
              {t("profileLink")} <span aria-hidden="true">→</span>
            </a>
          </p>
        )}
      </div>
    </article>
  );
}

export default function AlumniDirectory() {
  const t = useTranslations("alumni");
  const [records, setRecords] = useState<PublicPerson[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError(false);

    getPublicAlumniList()
      .then(setRecords)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    let cancelled = false;

    getPublicAlumniList()
      .then((items) => {
        if (!cancelled) setRecords(items);
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

  const filteredRecords = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return keyword
      ? records.filter((member) => searchableText(member).includes(keyword))
      : records;
  }, [records, search]);

  return (
    <section className="bg-[var(--paper)]">
      <PublicContainer className="py-14 sm:py-16">
        <div className="flex flex-col gap-4 border-b border-[var(--border)] pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-display text-3xl font-semibold tracking-[-0.04em] text-[var(--navy)] sm:text-4xl">
              {t("directoryTitle")}
            </h2>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--slate)]">
              {t("directoryDescription")}
            </p>
          </div>

          <div className="w-full sm:max-w-xs">
            <label htmlFor="alumni-search" className="sr-only">
              {t("searchLabel")}
            </label>

            <input
              id="alumni-search"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t("searchPlaceholder")}
              className="min-h-11 w-full border border-[var(--border)] bg-white px-4 text-sm text-[var(--navy)] outline-none transition focus:border-[var(--rams-red)] focus:ring-2 focus:ring-[var(--rams-red)]/15"
            />
          </div>
        </div>

        <div className="mt-6" aria-live="polite">
          {loading ? (
            <PublicLoading label={t("loading")} />
          ) : error ? (
            <PublicError message={t("error")} onRetry={load} />
          ) : filteredRecords.length === 0 ? (
            <PublicEmpty
              title={search ? t("noMatchingTitle") : t("emptyTitle")}
              description={
                search ? t("noMatchingDescription") : t("emptyDescription")
              }
            />
          ) : (
            <RevealOnScroll
              className="grid gap-x-6 gap-y-14 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
              stagger={90}
            >
              {filteredRecords.map((member) => (
                <AlumniCard key={member.id} member={member} />
              ))}
            </RevealOnScroll>
          )}
        </div>
      </PublicContainer>
    </section>
  );
}
