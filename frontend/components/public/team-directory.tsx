"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { getPublicPeopleList } from "@/lib/api/modules";
import type { PeopleCategory, PublicPeopleResponse, PublicPerson } from "@/types/people";
import { PublicEmpty, PublicError, PublicLoading } from "./public-states";
import PublicContainer from "./public-container";
import RevealOnScroll from "./reveal-on-scroll";

const categoryLabels: Record<PeopleCategory, string> = {
  DOSEN: "OUR LAB MEMBERS",
  MAHASISWA: "PH.D. STUDENTS",
  UNDERGRADUATE: "UNDERGRADUATE STUDENTS",
};

const categoryOrder: PeopleCategory[] = ["DOSEN", "MAHASISWA", "UNDERGRADUATE"];

function isLaboratoryHead(member: PublicPerson) {
  const role = [member.title, member.position].filter(Boolean).join(" ").toLowerCase();
  return /(head|ketua|kepala|director|coordinator|koordinator|leader)/.test(role);
}

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function ProfilePhoto({ name, photo, sizes }: { name: string; photo?: string; sizes: string }) {
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <div className="relative aspect-[4/3] overflow-hidden bg-[var(--navy)]">
      {photo && !imageFailed ? (
        <Image src={photo} alt={name} fill unoptimized sizes={sizes} onError={() => setImageFailed(true)} className="public-image-zoom object-cover object-[center_24%]" />
      ) : (
        <div className="grid h-full place-items-center bg-[var(--navy)] text-white" aria-label={`${name} avatar`}>
          <span className="font-display text-4xl font-semibold tracking-[-0.04em] text-white/85 sm:text-5xl">{getInitials(name)}</span>
        </div>
      )}
    </div>
  );
}

export function RoleLine({ member, fallback }: { member: PublicPerson; fallback: string }) {
  const role = [member.title, member.position].filter(Boolean).join(" · ");
  const year = member.graduationYear ? ` · ${member.graduationYear}` : "";
  return <p className="mt-2 font-mono text-[0.62rem] uppercase tracking-[0.1em] text-[var(--rams-red)]">{role ? `${role}${year}` : fallback}</p>;
}

export function ProfileLinks({ member, label }: { member: PublicPerson; label: string }) {
  return (
    <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 border-t border-[var(--border)] pt-4 text-sm font-semibold">
      {member.linkedin && <a href={member.linkedin} target="_blank" rel="noreferrer" className="public-card-arrow text-[var(--rams-red)]">{label} <span aria-hidden="true">→</span></a>}
    </div>
  );
}

function FeaturedApiProfile({ member, profileLabel, roleFallback, expertiseLabel }: { member: PublicPerson; profileLabel: string; roleFallback: string; expertiseLabel: string }) {
  return (
    <article className="public-card-interaction border border-[var(--border)] bg-white p-5 hover:border-[var(--ais-blue)] sm:p-7 lg:p-8">
      <div className="grid gap-8 lg:grid-cols-[minmax(18rem,.9fr)_1.1fr] lg:items-start lg:gap-10">
        <div className="group"><ProfilePhoto name={member.fullName} photo={member.photo} sizes="(max-width: 1024px) 100vw, 420px" /></div>
        <div>
          <h3 className="font-display text-3xl font-semibold tracking-[-0.045em] text-[var(--navy)] sm:text-4xl">{member.fullName}</h3>
          <RoleLine member={member} fallback={roleFallback} />
          {member.bio && <p className="mt-6 max-w-2xl whitespace-pre-wrap text-base leading-7 text-[var(--slate)]">{member.bio}</p>}
          {member.specialization.length > 0 && <div className="mt-7 border-t border-[var(--border)] pt-5"><p className="eyebrow text-[var(--ais-blue)]">{expertiseLabel}</p><p className="mt-3 text-sm leading-6 text-[var(--navy)]">{member.specialization.join(" · ")}</p></div>}
          <ProfileLinks member={member} label={profileLabel} />
        </div>
      </div>
    </article>
  );
}

function ExistingHeadProfile({ profileNote, roleLabel, expertiseLabel, name, photoAlt }: { profileNote: string; roleLabel: string; expertiseLabel: string; name: string; photoAlt: string }) {
  return (
    <article className="public-card-interaction border border-[var(--border)] bg-white p-5 hover:border-[var(--ais-blue)] sm:p-7 lg:p-8">
      <div className="grid gap-8 lg:grid-cols-[minmax(18rem,.9fr)_1.1fr] lg:items-start lg:gap-10">
        <div className="group"><div className="relative aspect-[4/3] overflow-hidden bg-[var(--navy)]"><Image src="/assets/prof-ketut.jpg" alt={photoAlt} fill sizes="(max-width: 1024px) 100vw, 420px" className="public-image-zoom object-cover object-[center_24%]" /></div></div>
        <div>
          <h3 className="font-display text-3xl font-semibold tracking-[-0.045em] text-[var(--navy)] sm:text-4xl">{name}</h3>
          <p className="mt-2 font-mono text-[0.62rem] uppercase tracking-[0.1em] text-[var(--rams-red)]">{roleLabel}</p>
          <div className="mt-7 border-t border-[var(--border)] pt-5"><p className="eyebrow text-[var(--ais-blue)]">{expertiseLabel}</p></div>
          <p className="mt-6 text-sm leading-6 text-[var(--gray)]">{profileNote}</p>
        </div>
      </div>
    </article>
  );
}

export function MemberCard({ member, profileLabel, roleFallback }: { member: PublicPerson; profileLabel: string; roleFallback: string }) {
  return (
    <article className="public-card-interaction group flex h-full flex-col border border-[var(--border)] bg-white p-4 hover:border-[var(--ais-blue)] sm:p-5">
      <div className="overflow-hidden"><ProfilePhoto name={member.fullName} photo={member.photo} sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" /></div>
      <div className="flex flex-1 flex-col pt-5">
        <h3 className="public-card-title font-display text-xl font-semibold leading-tight text-[var(--navy)]">{member.fullName}</h3>
        <RoleLine member={member} fallback={roleFallback} />
        {member.specialization.length > 0 && <p className="mt-5 text-sm leading-6 text-[var(--slate)]">{member.specialization.join(" · ")}</p>}
        {member.linkedin && <div className="mt-auto pt-5"><ProfileLinks member={member} label={profileLabel} /></div>}
      </div>
    </article>
  );
}

function searchableText(member: PublicPerson) {
  return [member.fullName, member.title, member.position, ...member.specialization].filter(Boolean).join(" ").toLowerCase();
}

export default function TeamDirectory() {
  const t = useTranslations("team");
  const [people, setPeople] = useState<PublicPeopleResponse>({ DOSEN: [], MAHASISWA: [], UNDERGRADUATE: [] });
  const [activeCategory, setActiveCategory] = useState<PeopleCategory>("DOSEN");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError(false);
    getPublicPeopleList().then(setPeople).catch(() => setError(true)).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    let cancelled = false;
    getPublicPeopleList()
      .then((records) => { if (!cancelled) setPeople(records); })
      .catch(() => { if (!cancelled) setError(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const categoryLabel = categoryLabels[activeCategory];
  const filteredMembers = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return people[activeCategory];
    return people[activeCategory].filter((member) => searchableText(member).includes(keyword));
  }, [activeCategory, people, search]);
  const featured = useMemo(() => activeCategory === "DOSEN" ? filteredMembers.find(isLaboratoryHead) : undefined, [activeCategory, filteredMembers]);
  const members = activeCategory === "DOSEN" ? filteredMembers.filter((member) => member.id !== featured?.id) : filteredMembers;

  return (
    <section className="team-directory bg-[var(--paper)]">
      <PublicContainer className="py-20 sm:py-24">
        <nav aria-label="People categories" className="flex flex-wrap gap-2 border-b border-[var(--border)] pb-4">
          {categoryOrder.map((category) => <button key={category} type="button" aria-pressed={activeCategory === category} onClick={() => { setActiveCategory(category); setSearch(""); }}
          className={`border px-4 py-2.5 text-xs font-bold uppercase tracking-[0.1em] transition-colors ${activeCategory === category ? "border-[var(--navy)] bg-[var(--navy)] text-white" : "border-[var(--border)] bg-white text-[var(--gray)] hover:border-[var(--rams-red)] hover:text-[var(--rams-red)]"}`}>{categoryLabels[category]}</button>)}
        </nav>

        <div className="mt-12 flex flex-col gap-5 border-b border-[var(--border)] pb-10 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="eyebrow text-[var(--rams-red)]">{categoryLabel}</p>
            <h2 id="people-category-heading" className="mt-4 font-display text-3xl font-semibold tracking-[-0.04em] text-[var(--navy)] sm:text-4xl">{categoryLabel}</h2>
          </div>
          <div className="w-full sm:max-w-xs">
            <label htmlFor="people-search" className="sr-only">Search people</label>
            <input id="people-search" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search people" className="min-h-11 w-full border border-[var(--border)] bg-white px-4 text-sm text-[var(--navy)] outline-none transition focus:border-[var(--rams-red)] focus:ring-2 focus:ring-[var(--rams-red)]/15" />
          </div>
        </div>

        <div className="mt-10" aria-live="polite">
          {loading ? <PublicLoading label={t("loading")} /> : error ? <PublicError message={t("error")} onRetry={load} /> : activeCategory === "DOSEN" && !search && <RevealOnScroll>
            <p className="eyebrow text-[var(--ais-blue)]">{t("headEyebrow")}</p>
            <div className="mt-6">{featured ? <FeaturedApiProfile member={featured} profileLabel={t("profileLink")} roleFallback={t("roleFallback")} expertiseLabel={t("expertise")} /> : <ExistingHeadProfile profileNote={t("existingHeadNote")} roleLabel={t("leadership")} expertiseLabel={t("expertise")} name={t("headName")} photoAlt={t("headPhotoAlt")} />}</div>
          </RevealOnScroll>}

          {!loading && !error && members.length > 0 && <div className={`${activeCategory === "DOSEN" && !search ? "mt-16 border-t border-[var(--border)] pt-12" : ""}`}>
            {activeCategory === "DOSEN" && !search && <p className="mb-8 text-sm leading-6 text-[var(--slate)]">{t("staffDescription")}</p>}
            <RevealOnScroll className="grid gap-4 md:grid-cols-2 lg:grid-cols-3" stagger={90}>
              {members.map((member) => <MemberCard key={member.id} member={member} profileLabel={t("profileLink")} roleFallback={t("roleFallback")} />)}
            </RevealOnScroll>
          </div>}

          {!loading && !error && members.length === 0 && !(activeCategory === "DOSEN" && !search) && <PublicEmpty title="No profiles published" description="Profiles in this category will appear here when available." />}
        </div>
      </PublicContainer>
    </section>
  );
}
