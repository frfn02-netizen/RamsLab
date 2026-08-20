"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { getPublicDosenList } from "@/lib/api/modules";
import type { Dosen } from "@/types/modules";
import { PublicEmpty, PublicError, PublicLoading } from "./public-states";
import PublicContainer from "./public-container";
import RevealOnScroll from "./reveal-on-scroll";

function isLaboratoryHead(member: Dosen) {
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

function ProfilePhoto({ name, photo, sizes }: { name: string; photo?: string; sizes: string }) {
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
        <div className="grid h-full place-items-center bg-[var(--navy)] text-white" aria-label={`${name} avatar`}>
          <span className="font-display text-4xl font-semibold tracking-[-0.04em] text-white/85 sm:text-5xl">{getInitials(name)}</span>
        </div>
      )}
    </div>
  );
}

function RoleLine({ member, fallback }: { member: Dosen; fallback: string }) {
  const role = [member.title, member.position].filter(Boolean).join(" · ");
  return <p className="mt-2 font-mono text-[0.62rem] uppercase tracking-[0.1em] text-[var(--rams-red)]">{role || fallback}</p>;
}

function ProfileLinks({ member, label }: { member: Dosen; label: string }) {
  return (
    <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 border-t border-[var(--border)] pt-4 text-sm font-semibold">
      {member.linkedin && <a href={member.linkedin} target="_blank" rel="noreferrer" className="public-card-arrow text-[var(--rams-red)]">{label} <span aria-hidden="true">→</span></a>}
      {member.email && <a href={`mailto:${member.email}`} className="text-[var(--navy)] transition-colors hover:text-[var(--rams-red)]">{member.email}</a>}
    </div>
  );
}

function FeaturedApiProfile({ member, profileLabel, roleFallback, expertiseLabel }: { member: Dosen; profileLabel: string; roleFallback: string; expertiseLabel: string }) {
  return (
    <article className="public-card-interaction border border-[var(--border)] bg-white p-5 hover:border-[var(--ais-blue)] sm:p-7 lg:p-8">
      <div className="grid gap-8 lg:grid-cols-[minmax(18rem,.9fr)_1.1fr] lg:items-start lg:gap-10">
        <div className="group"><ProfilePhoto name={member.fullName} photo={member.photo} sizes="(max-width: 1024px) 100vw, 420px" /></div>
        <div>
          <h2 className="font-display text-3xl font-semibold tracking-[-0.045em] text-[var(--navy)] sm:text-4xl">{member.fullName}</h2>
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
          <h2 className="font-display text-3xl font-semibold tracking-[-0.045em] text-[var(--navy)] sm:text-4xl">{name}</h2>
          <p className="mt-2 font-mono text-[0.62rem] uppercase tracking-[0.1em] text-[var(--rams-red)]">{roleLabel}</p>
          <div className="mt-7 border-t border-[var(--border)] pt-5"><p className="eyebrow text-[var(--ais-blue)]">{expertiseLabel}</p></div>
          <p className="mt-6 text-sm leading-6 text-[var(--gray)]">{profileNote}</p>
        </div>
      </div>
    </article>
  );
}

function MemberCard({ member, profileLabel, roleFallback }: { member: Dosen; profileLabel: string; roleFallback: string }) {
  return (
    <article className="public-card-interaction group flex h-full flex-col border border-[var(--border)] bg-white p-4 hover:border-[var(--ais-blue)] sm:p-5">
      <div className="overflow-hidden"><ProfilePhoto name={member.fullName} photo={member.photo} sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" /></div>
      <div className="flex flex-1 flex-col pt-5">
        <h3 className="public-card-title font-display text-xl font-semibold leading-tight text-[var(--navy)]">{member.fullName}</h3>
        <RoleLine member={member} fallback={roleFallback} />
        {member.specialization.length > 0 && <p className="mt-5 text-sm leading-6 text-[var(--slate)]">{member.specialization.join(" · ")}</p>}
        {(member.linkedin || member.email) && <div className="mt-auto pt-5"><ProfileLinks member={member} label={profileLabel} /></div>}
      </div>
    </article>
  );
}

export default function TeamDirectory() {
  const t = useTranslations("team");
  const [members, setMembers] = useState<Dosen[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError(false);
    getPublicDosenList().then((records) => setMembers(records.filter((record) => record.isPublic))).catch(() => setError(true)).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    let cancelled = false;
    getPublicDosenList()
      .then((records) => { if (!cancelled) setMembers(records.filter((record) => record.isPublic)); })
      .catch(() => { if (!cancelled) setError(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const featured = useMemo(() => members.find(isLaboratoryHead), [members]);
  const researchers = useMemo(() => members.filter((member) => member._id !== featured?._id), [featured, members]);

  return (
    <section className="team-directory bg-[var(--paper)]">
      <PublicContainer className="py-20 sm:py-24">
        <RevealOnScroll>
          <p className="eyebrow text-[var(--rams-red)]">{t("headEyebrow")}</p>
          <div className="mt-6">{featured ? <FeaturedApiProfile member={featured} profileLabel={t("profileLink")} roleFallback={t("roleFallback")} expertiseLabel={t("expertise")} /> : <ExistingHeadProfile profileNote={t("existingHeadNote")} roleLabel={t("leadership")} expertiseLabel={t("expertise")} name={t("headName")} photoAlt={t("headPhotoAlt")} />}</div>
        </RevealOnScroll>

        <div className="mt-24 border-t border-[var(--border)] pt-16 sm:mt-28 sm:pt-20">
          <RevealOnScroll className="max-w-3xl">
            <p className="eyebrow text-[var(--ais-blue)]">{t("staffEyebrow")}</p>
            <h2 className="mt-4 font-display text-3xl font-semibold tracking-[-0.04em] text-[var(--navy)] sm:text-4xl">{t("staffTitle")}</h2>
            <p className="mt-5 text-base leading-7 text-[var(--slate)]">{t("staffDescription")}</p>
          </RevealOnScroll>
          <div className="mt-10">{loading ? <PublicLoading label={t("loading")} /> : error ? <PublicError message={t("error")} onRetry={load} /> : researchers.length > 0 ? <RevealOnScroll className="grid gap-4 md:grid-cols-2 lg:grid-cols-3" stagger={90}>{researchers.map((member) => <MemberCard key={member._id} member={member} profileLabel={t("profileLink")} roleFallback={t("roleFallback")} />)}</RevealOnScroll> : <PublicEmpty title={t("emptyTitle")} description={t("emptyDescription")} />}</div>
        </div>
      </PublicContainer>
    </section>
  );
}
