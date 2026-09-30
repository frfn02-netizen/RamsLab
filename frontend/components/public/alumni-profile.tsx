"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { formatAlumniClassLabel } from "@/lib/alumni-label";
import { getPublicAlumniById } from "@/lib/api/modules";
import type { PublicPerson } from "@/types/people";
import PublicContainer from "./public-container";
import { PublicError, PublicLoading } from "./public-states";

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-mono text-[0.68rem] font-bold uppercase tracking-[0.14em] text-[var(--gray)]">
        {label}
      </dt>
      <dd className="mt-2 text-lg font-medium leading-7 text-[var(--navy)]">
        {value}
      </dd>
    </div>
  );
}

export default function AlumniProfile({ id }: { id: string }) {
  const t = useTranslations("alumni");
  const [profile, setProfile] = useState<PublicPerson | undefined>(undefined);
  const [imageFailed, setImageFailed] = useState(false);
  const [error, setError] = useState(false);
  const classOfLabel = formatAlumniClassLabel(profile, t("classOf"));

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

  const program = profile.program?.trim();
  const position = profile.position?.trim();
  const company = profile.specialization?.[0]?.trim();
  const location = profile.location?.trim();
  const bio = profile.bio?.trim();
  const linkedin = profile.linkedin?.trim();

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

          <article className="mt-8 border border-[var(--border)] bg-white">
            <div
              className={
                profile.photo && !imageFailed
                  ? "grid gap-10 p-6 sm:grid-cols-[minmax(210px,30%)_minmax(0,1fr)] sm:gap-10 sm:p-10 lg:gap-14 lg:p-14"
                  : "p-6 sm:p-10 lg:p-14"
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

                {classOfLabel && (
                  <p className="mt-5 font-mono text-sm font-bold uppercase tracking-[0.1em] text-[var(--rams-red)]">
                    {classOfLabel}
                  </p>
                )}

                {(program || position || company || location) && (
                  <dl
                    data-testid="alumni-metadata-grid"
                    className="mt-10 grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:gap-x-12 lg:gap-y-10"
                  >
                    {program && <DetailItem label={t("programLabel")} value={program} />}
                    {position && (
                      <DetailItem label={t("positionLabel")} value={position} />
                    )}
                    {company && (
                      <DetailItem label={t("companyLabel")} value={company} />
                    )}
                    {location && (
                      <DetailItem label={t("locationLabel")} value={location} />
                    )}
                  </dl>
                )}

                {bio && (
                  <section className="mt-8 border-t border-[var(--border)] pt-7">
                    <h2 className="font-mono text-xs font-bold uppercase tracking-[0.14em] text-[var(--rams-red)]">
                      {t("bioLabel")}
                    </h2>
                    <p className="mt-4 whitespace-pre-wrap text-base leading-7 text-[var(--slate)]">
                      {bio}
                    </p>
                  </section>
                )}

                {linkedin && (
                  <div className="mt-8">
                    <a
                      href={linkedin}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 font-semibold text-[var(--rams-red)] transition-colors hover:text-[var(--navy)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--rams-red)]"
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
