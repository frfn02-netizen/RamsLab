"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { getPublicAlumniList } from "@/lib/api/modules";
import type { PublicPerson } from "@/types/people";
import PublicContainer from "./public-container";
import { PublicEmpty, PublicError, PublicLoading } from "./public-states";
import RevealOnScroll from "./reveal-on-scroll";
import { MemberCard } from "./team-directory";

function searchableText(member: PublicPerson) {
  return [member.fullName, member.title, member.position, ...member.specialization]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
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
      .then((items) => { if (!cancelled) setRecords(items); })
      .catch(() => { if (!cancelled) setError(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const filteredRecords = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return keyword ? records.filter((member) => searchableText(member).includes(keyword)) : records;
  }, [records, search]);

  return (
    <section className="bg-[var(--paper)]">
      <PublicContainer className="py-20 sm:py-24">
        <div className="flex flex-col gap-5 border-b border-[var(--border)] pb-10 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="eyebrow text-[var(--rams-red)]">{t("directoryEyebrow")}</p>
            <h2 className="mt-4 font-display text-3xl font-semibold tracking-[-0.04em] text-[var(--navy)] sm:text-4xl">{t("directoryTitle")}</h2>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-[var(--slate)]">{t("directoryDescription")}</p>
          </div>
          <div className="w-full sm:max-w-xs">
            <label htmlFor="alumni-search" className="sr-only">{t("searchLabel")}</label>
            <input id="alumni-search" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t("searchPlaceholder")} className="min-h-11 w-full border border-[var(--border)] bg-white px-4 text-sm text-[var(--navy)] outline-none transition focus:border-[var(--rams-red)] focus:ring-2 focus:ring-[var(--rams-red)]/15" />
          </div>
        </div>

        <div className="mt-10" aria-live="polite">
          {loading ? <PublicLoading label={t("loading")} /> : error ? <PublicError message={t("error")} onRetry={load} /> : filteredRecords.length === 0 ? <PublicEmpty title={search ? t("noMatchingTitle") : t("emptyTitle")} description={search ? t("noMatchingDescription") : t("emptyDescription")} /> : <RevealOnScroll className="grid gap-4 md:grid-cols-2 lg:grid-cols-3" stagger={90}>
            {filteredRecords.map((member) => <MemberCard key={member.id} member={member} profileLabel={t("profileLink")} roleFallback={t("roleFallback")} />)}
          </RevealOnScroll>}
        </div>
      </PublicContainer>
    </section>
  );
}
