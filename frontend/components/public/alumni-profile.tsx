"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { getPublicAlumniById } from "@/lib/api/modules";
import type { PublicPerson } from "@/types/people";
import PublicContainer from "./public-container";
import { PublicError, PublicLoading } from "./public-states";

export default function AlumniProfile({ id }: { id: string }) {
  const t = useTranslations("alumni");
  const [profile, setProfile] = useState<PublicPerson | undefined>(undefined);
  const [imageFailed, setImageFailed] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    getPublicAlumniById(id)
      .then((result) => {
        if (!cancelled) {
          if (result) {
            setProfile(result);
          } else {
            setError(true);
          }
        }
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  if (profile === undefined && !error) {
    return (
      <PublicContainer className="py-20">
        <PublicLoading label={t("loading")} />
      </PublicContainer>
    );
  }

  if (error || !profile) {
    return (
      <PublicContainer className="py-20">
        <PublicError message={t("error")} />
        <Link
          href="/team?category=ALUMNI"
          className="mt-6 inline-block text-sm font-semibold text-[var(--rams-red)]"
        >
          ← {t("backToAlumni")}
        </Link>
      </PublicContainer>
    );
  }

  const company = profile.specialization?.[0];
  const hasBio = Boolean(profile.bio?.trim());
  const hasLinkedin = Boolean(profile.linkedin);

  return (
    <main className="bg-[var(--paper)]">
      <PublicContainer className="py-10 sm:py-16 lg:py-24">
        <div className="mx-auto max-w-4xl">
          <Link
            href="/team?category=ALUMNI"
            className="text-sm font-semibold text-[var(--rams-red)] transition-colors hover:text-[var(--navy)]"
          >
            ← {t("backToAlumni")}
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
                  {t("detailCategory")}
                </p>

                <h1 className="mt-5 font-display text-5xl font-semibold leading-[0.96] tracking-[-0.055em] text-[var(--navy)] sm:text-6xl">
                  {profile.fullName}
                </h1>

                {profile.angkatan && (
                  <p className="mt-6 font-mono text-sm uppercase tracking-[0.1em] text-[var(--gray)]">
                    P{profile.angkatan}
                  </p>
                )}

                {profile.position && (
                  <p className="mt-3 text-xl leading-8 text-[var(--slate)]">
                    {profile.position}
                  </p>
                )}

                {company && (
                  <p className="mt-2 text-base leading-7 text-[var(--gray)]">
                    {company}
                  </p>
                )}

                {profile.location && (
                  <p className="mt-2 text-base leading-7 text-[var(--gray)]">
                    {profile.location}
                  </p>
                )}

                {hasBio && (
                  <div className="mt-8 border-t border-[var(--border)] pt-6">
                    <p className="font-mono text-xs font-bold uppercase tracking-[0.14em] text-[var(--gray)]">
                      {t("bioLabel")}
                    </p>
                    <p className="mt-3 whitespace-pre-wrap text-base leading-7 text-[var(--slate)]">
                      {profile.bio}
                    </p>
                  </div>
                )}

                {hasLinkedin && (
                  <div className="mt-8">
                    <a
                      href={profile.linkedin}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 font-semibold text-[var(--rams-red)] hover:text-[var(--navy)]"
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
