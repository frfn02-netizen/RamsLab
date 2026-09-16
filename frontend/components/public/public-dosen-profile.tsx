"use client";

import Image from "next/image";
import { useEffect, useState, type ReactNode } from "react";
import { useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { getPublicDosenById } from "@/lib/api/modules";
import type { PublicPerson } from "@/types/people";
import PublicContainer from "./public-container";
import { PublicError, PublicLoading } from "./public-states";

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function ExternalLinkIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14 5h5v5M19 5l-8 8" />
      <path d="M19 14v3.5A1.5 1.5 0 0 1 17.5 19h-11A1.5 1.5 0 0 1 5 17.5v-11A1.5 1.5 0 0 1 6.5 5H10" />
    </svg>
  );
}

function AcademicLinkIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5v-16Z" />
      <path d="M4 5.5v16M8 7h8M8 11h8" />
    </svg>
  );
}

function ProfileSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="border-t border-[var(--border)] pt-7">
      <h2 className="font-display text-2xl font-semibold tracking-[-0.03em] text-[var(--navy)]">
        {title}
      </h2>
      <div className="mt-6">{children}</div>
    </section>
  );
}

function EducationTimeline({
  education,
}: {
  education: NonNullable<PublicPerson["education"]>;
}) {
  if (education.length === 0) return null;
  return (
    <ProfileSection title="Education">
      <div className="relative space-y-8 pb-1 before:absolute before:bottom-3 before:left-[5px] before:top-3 before:w-px before:bg-[var(--border)]">
        {education.map((item, index) => (
          <article
            key={`${item.degree}-${item.institution}-${index}`}
            className="relative pl-8"
          >
            <span className="absolute left-0 top-1.5 h-3 w-3 rounded-full border-2 border-[var(--rams-red)] bg-[var(--paper)]" />
            <h3 className="font-display text-2xl font-semibold leading-tight text-[var(--navy)]">
              {item.degree}
            </h3>
            <p className="mt-2 text-base leading-7 text-[var(--slate)]">
              {item.field}
            </p>
            <p className="mt-1 text-base leading-7 text-[var(--gray)]">
              {item.institution}
            </p>
            {(item.startYear || item.endYear) && (
              <p className="mt-3 font-mono text-xs font-bold uppercase tracking-[0.12em] text-[var(--rams-red)]">
                {item.startYear ?? "—"} — {item.endYear ?? "Present"}
              </p>
            )}
          </article>
        ))}
      </div>
    </ProfileSection>
  );
}

function AcademicProfiles({ links }: { links: Array<[string, string]> }) {
  if (links.length === 0) return null;
  return (
    <ProfileSection title="Academic Profiles">
      <div className="space-y-3">
        {links.map(([label, url]) => (
          <a
            key={label}
            href={url}
            target="_blank"
            rel="noreferrer"
            className="flex min-h-14 items-center gap-3 border border-[var(--border)] bg-white px-4 py-3 text-sm font-semibold text-[var(--navy)] transition-colors hover:border-[var(--rams-red)] hover:text-[var(--rams-red)]"
          >
            <AcademicLinkIcon />
            <span className="min-w-0 flex-1">{label}</span>
            <ExternalLinkIcon />
          </a>
        ))}
      </div>
    </ProfileSection>
  );
}

function ProfileLinks({ links }: { links: Array<[string, string]> }) {
  if (links.length === 0) return null;
  return (
    <div className="mt-5 flex flex-wrap gap-2.5">
      {links.map(([label, url]) => (
        <a
          key={label}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 border border-[var(--border)] px-4 py-2.5 text-[0.8rem] font-bold uppercase tracking-[0.08em] text-[var(--navy)] transition-colors hover:border-[var(--rams-red)] hover:text-[var(--rams-red)]"
        >
          <span>{label}</span>
          <ExternalLinkIcon />
        </a>
      ))}
    </div>
  );
}

function PublicStudentProfile({ profile }: { profile: PublicPerson }) {
  const [imageFailed, setImageFailed] = useState(false);
  const locale = useLocale() === "id" ? "id" : "en";
  const category =
    profile.category === "MAHASISWA"
      ? "PHD"
      : profile.category === "MASTER"
        ? "MASTER"
        : profile.category === "INTERNSHIP"
          ? "VOCATIONAL INTERN"
          : "UNDERGRADUATE STUDENT";

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return null;
    try {
      return new Intl.DateTimeFormat(locale, {
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(new Date(dateStr));
    } catch {
      return null;
    }
  };

  const pklStartDate = formatDate(profile.internshipStartDate);
  const pklEndDate = formatDate(profile.internshipEndDate);
  const hasPklPeriod = pklStartDate || pklEndDate;

  return (
    <main className="bg-[var(--paper)]">
      <PublicContainer className="py-10 sm:py-16 lg:py-24">
        <div className="mx-auto max-w-4xl">
          <Link
            href="/team"
            className="text-sm font-semibold text-[var(--rams-red)] transition-colors hover:text-[var(--navy)]"
          >
            ← Back to people
          </Link>
          <article className="mt-8 border border-[var(--border)] bg-white p-7 sm:p-10 lg:p-14">
            <div
              className={
                profile.photo && !imageFailed
                  ? "grid gap-10 sm:grid-cols-[minmax(200px,32%)_minmax(0,1fr)] sm:gap-12 lg:gap-14"
                  : undefined
              }
            >
              {profile.photo && !imageFailed && (
                <div className="relative aspect-[4/5] self-start overflow-hidden bg-[var(--navy)]">
                  <Image
                    src={profile.photo}
                    alt={profile.fullName}
                    fill
                    onError={() => setImageFailed(true)}
                    className="object-cover"
                    sizes="(max-width: 640px) 100vw, 30vw"
                  />
                </div>
              )}
              <div className="min-w-0">
                <p className="font-mono text-sm font-bold uppercase tracking-[0.18em] text-[var(--rams-red)]">
                  {category}
                </p>
                <h1 className="mt-5 font-display text-5xl font-semibold leading-[0.96] tracking-[-0.055em] text-[var(--navy)] sm:text-6xl">
                  {profile.fullName}
                </h1>
                {profile.title && (
                  <p className="mt-6 text-xl leading-8 text-[var(--slate)]">
                    {profile.title}
                  </p>
                )}
                {profile.specialization.length > 0 && (
                  <p className="mt-3 text-sm uppercase tracking-[0.1em] text-[var(--gray)]">
                    {profile.specialization.join(" · ")}
                  </p>
                )}
                {hasPklPeriod && (
                  <div className="mt-4">
                    <p className="text-xs font-bold uppercase tracking-[0.15em] text-[var(--rams-red)]">
                      {locale === "id" ? "Periode PKL" : "PKL Period"}
                    </p>
                    <p className="mt-1 text-base text-[var(--slate)]">
                      {pklStartDate || "—"} – {pklEndDate || "—"}
                    </p>
                  </div>
                )}
                {profile.bio && (
                  <div className="mt-8 border-t border-[var(--border)] pt-6">
                    <p className="whitespace-pre-wrap text-base leading-7 text-[var(--slate)]">
                      {profile.bio}
                    </p>
                  </div>
                )}

                {profile.linkedin && (
                  <div className="mt-8">
                    <a
                      href={profile.linkedin}
                      target="_blank"
                      rel="noreferrer"
                      className="font-semibold text-[var(--rams-red)] hover:text-[var(--navy)]"
                    >
                      LinkedIn <span aria-hidden="true">→</span>
                    </a>
                  </div>
                )}
              </div>
            </div>
          </article>
        </div>
      </PublicContainer>
    </main>
  );
}

export default function PublicDosenProfile({ id }: { id: string }) {
  const [profile, setProfile] = useState<PublicPerson | null>(null);
  const [imageFailed, setImageFailed] = useState(false);
  const [error, setError] = useState(false);
  useEffect(() => {
    let cancelled = false;
    getPublicDosenById(id)
      .then((result) => {
        if (!cancelled) setProfile(result);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);
  if (!profile && !error)
    return (
      <PublicContainer className="py-20">
        <PublicLoading label="Loading profile" />
      </PublicContainer>
    );
  if (error || !profile)
    return (
      <PublicContainer className="py-20">
        <PublicError message="This public profile is unavailable." />
        <Link
          href="/team"
          className="mt-6 inline-block font-semibold text-[var(--rams-red)]"
        >
          ← Back to people
        </Link>
      </PublicContainer>
    );

  if (profile.category !== "DOSEN") {
    return <PublicStudentProfile key={profile.id} profile={profile} />;
  }

  const academicLinks = [
    ["SINTA", profile.sintaUrl],
    ["Google Scholar", profile.googleScholarUrl],
    ["Scopus", profile.scopusUrl],
    ["ORCID", profile.orcidUrl],
  ].filter((item): item is [string, string] => Boolean(item[1]));
  const profileLinks = [["LinkedIn", profile.linkedin]].filter(
    (item): item is [string, string] => Boolean(item[1]),
  );
  const metadataFields = [
    ["Institution", profile.institution],
    ["Faculty", profile.faculty],
    ["Department", profile.department],
    ...(profile.nip ? [["NIP", profile.nip] as [string, string]] : []),
    ...(profile.nidn ? [["NIDN", profile.nidn] as [string, string]] : []),
  ];

  return (
    <main className="bg-[var(--paper)]">
      <PublicContainer className="py-10 sm:py-16 lg:py-24">
        <Link
          href="/team"
          className="text-[0.95rem] font-semibold text-[var(--rams-red)] transition-colors hover:text-[var(--navy)]"
        >
          ← Back to people
        </Link>

        <section className="mt-8 border border-[var(--border)] bg-white">
          {/* Profile hero: photo + info */}
          <div className="flex flex-col gap-8 p-6 sm:p-8 lg:flex-row lg:gap-10 lg:p-8">
            {/* Photo */}
            <div className="relative w-full flex-shrink-0 self-start overflow-hidden rounded-[4px] bg-[var(--navy)] sm:w-[280px] lg:w-[300px]">
              <div className="aspect-[4/5]">
                {profile.photo && !imageFailed ? (
                  <Image
                    src={profile.photo}
                    alt={profile.fullName}
                    fill
                    priority
                    onError={() => setImageFailed(true)}
                    className="object-cover"
                    sizes="(max-width: 1024px) 280px, 300px"
                  />
                ) : (
                  <div className="grid h-full place-items-center text-7xl font-semibold text-white/85">
                    {initials(profile.fullName)}
                  </div>
                )}
              </div>
            </div>

            {/* Profile info */}
            <div className="flex min-w-0 flex-1 flex-col justify-center">
              <p className="font-mono text-[0.7rem] font-bold uppercase tracking-[0.18em] text-[var(--rams-red)]">
                Academic Profile · Expert
              </p>
              <h1 className="mt-4 max-w-[650px] break-words font-display text-[3.25rem] font-bold leading-[1.02] tracking-[-0.04em] text-[var(--navy)] sm:text-[3.75rem] lg:text-[4rem]">
                {profile.fullName}
              </h1>
              {profile.specialization.length > 0 && (
                <div className="mt-8">
                  <p className="font-mono text-[0.8rem] font-bold uppercase tracking-[0.14em] text-[var(--gray)]">
                    Specialization
                  </p>
                  <p className="mt-2 text-[1.15rem] leading-relaxed text-[var(--slate)]">
                    {profile.specialization.join(" · ")}
                  </p>
                </div>
              )}
              <ProfileLinks links={profileLinks} />
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-[var(--border)]" />

          {/* Institutional metadata row */}
          <dl className="grid grid-cols-2 gap-x-6 gap-y-5 p-6 sm:p-8 lg:grid-cols-4 lg:gap-x-8">
            {metadataFields.map(([label, value]) => (
              <div key={label} className="min-w-0">
                <dt className="font-mono text-[0.75rem] font-bold uppercase tracking-[0.14em] text-[var(--gray)]">
                  {label}
                </dt>
                <dd className="mt-1 text-[1.05rem] leading-snug text-[var(--slate)]">
                  {value}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        {/* Education + Academic Profiles */}
        <div className="mt-16 grid gap-14 lg:grid-cols-[minmax(0,65%)_minmax(240px,35%)] lg:gap-16">
          <EducationTimeline education={profile.education ?? []} />
          <AcademicProfiles links={academicLinks} />
        </div>

        <aside className="mt-16 border-t border-[var(--border)] pt-6 text-sm leading-7 text-[var(--gray)]">
          Informasi yang ditampilkan mengikuti pengaturan privasi yang
          ditentukan oleh dosen. Data NIP, NIDN, dan email hanya ditampilkan
          jika diizinkan.
        </aside>
      </PublicContainer>
    </main>
  );
}
