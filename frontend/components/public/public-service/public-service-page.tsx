"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  getPublicServiceDetail,
  getPublicServicePage,
} from "@/lib/api/modules";
import type {
  PublicServiceDetail,
  PublicServicePageData,
} from "@/types/modules";
import { ProfilePhoto } from "../team-directory";
import PageHero from "../page-hero";
import PublicContainer from "../public-container";

export default function PublicServicePage() {
  const locale = useLocale() === "id" ? "id" : "en";
  const t = useTranslations("publicService");
  const common = useTranslations("common");
  const [data, setData] = useState<PublicServicePageData | null>(null);
  const [details, setDetails] = useState<Record<string, PublicServiceDetail>>(
    {},
  );
  const [detailErrors, setDetailErrors] = useState<Record<string, boolean>>({});
  const [openId, setOpenId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const localized = (value?: { en: string; id: string }) =>
    value?.[locale] || value?.en || value?.id || "";

  useEffect(() => {
    getPublicServicePage()
      .then(setData)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  async function toggleService(id: string) {
    if (openId === id) {
      setOpenId(null);
      return;
    }
    setOpenId(id);
    if (!details[id] && !detailErrors[id]) {
      try {
        const detail = await getPublicServiceDetail(id);
        setDetails((current) => ({ ...current, [id]: detail }));
      } catch {
        setDetailErrors((current) => ({ ...current, [id]: true }));
      }
    }
  }

  return (
    <main>
      <PageHero
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={t("description")}
      />
      <PublicContainer className="space-y-16 py-16 sm:py-20">
        {loading ? (
          <p className="text-sm font-semibold text-[var(--rams-gray)]">
            {common("loading")}
          </p>
        ) : error || !data ? (
          <p className="text-sm font-semibold text-red-700">
            {common("requestUnavailable")}
          </p>
        ) : (
          <>
            <section>
              <SectionTitle
                eyebrow={t("expertsEyebrow")}
                title={t("expertsTitle")}
              />
              {data.experts.length === 0 ? (
                <p className="mt-6 text-sm font-semibold text-[var(--rams-gray)]">
                  {common("noPublishedRecords")}
                </p>
              ) : (
                <div className="mt-8 grid gap-x-6 gap-y-14 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                  {data.experts.map((expert) => (
                    <article
                      key={expert.id}
                      className="group flex h-full min-w-0 flex-col"
                    >
                      <div className="overflow-hidden border border-[var(--border)] bg-white">
                        <ProfilePhoto
                          name={expert.person.fullName}
                          photo={expert.person.photo}
                          sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1280px) 25vw, 20vw"
                        />
                      </div>
                      <div className="flex flex-1 flex-col pt-5">
                        <h3 className="font-display min-h-[3.25rem] text-xl font-semibold leading-tight tracking-[-0.025em] text-[var(--navy)] transition-colors group-hover:text-[var(--rams-red)]">
                          {expert.person.fullName}
                        </h3>
                        {localized(expert.expertise) && (
                          <p className="mt-2 text-sm leading-6 text-[var(--slate)]">
                            {localized(expert.expertise)}
                          </p>
                        )}
                        <div className="mt-auto pt-5">
                          <Link
                            href={`/team/${expert.person.id}`}
                            className="inline-flex font-semibold text-[var(--rams-red)] hover:text-[var(--navy)]"
                          >
                            {t("profileLink")}{" "}
                            <span className="ml-2" aria-hidden="true">
                              →
                            </span>
                          </Link>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
            <section>
              <SectionTitle
                eyebrow={t("servicesEyebrow")}
                title={t("servicesTitle")}
              />
              {data.services.length === 0 ? (
                <p className="mt-6 text-sm font-semibold text-[var(--rams-gray)]">
                  {common("noPublishedRecords")}
                </p>
              ) : (
                <div className="mt-10 divide-y divide-[var(--border)]">
                  {data.services.map((service) => {
                    const detail = details[service.id];
                    const open = openId === service.id;
                    return (
                      <article key={service.id} className="group/service">
                        <button
                          type="button"
                          className="flex w-full items-start justify-between gap-6 py-7 text-left transition-colors duration-300 hover:bg-[var(--background-light)] sm:items-center"
                          onClick={() => void toggleService(service.id)}
                          aria-expanded={open}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-baseline gap-3">
                              <h3 className="font-display text-xl font-semibold leading-tight tracking-[-0.025em] text-[var(--navy)] transition-colors duration-300 group-hover/service:text-[var(--rams-red)] sm:text-2xl">
                                {localized(service.title)}
                              </h3>
                              {service.code && (
                                <span className="hidden font-mono text-xs font-bold uppercase tracking-[0.08em] text-[var(--gray)] sm:inline">
                                  {service.code}
                                </span>
                              )}
                            </div>
                            {localized(service.description) && (
                              <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--slate)] line-clamp-2">
                                {localized(service.description)}
                              </p>
                            )}
                          </div>
                          <span className="mt-1 inline-flex shrink-0 items-center gap-2 text-sm font-semibold text-[var(--rams-red)] transition-colors duration-300 group-hover/service:text-[var(--rams-red-dark)] sm:mt-0">
                            <span className="hidden sm:inline">
                              {open ? t("closeLabel") : t("openLabel")}
                            </span>
                            <span
                              className={`inline-flex h-8 w-8 items-center justify-center border border-[var(--border)] text-lg transition-all duration-300 group-hover/service:border-[var(--rams-red)]/55 group-hover/service:text-[var(--rams-red)] ${
                                open
                                  ? "rotate-45 border-[var(--rams-red)]/55 text-[var(--rams-red)]"
                                  : ""
                              }`}
                              aria-hidden="true"
                            >
                              +
                            </span>
                          </span>
                        </button>
                        {open && (
                          <div className="pb-8">
                            {detailErrors[service.id] ? (
                              <p className="text-sm font-semibold text-red-700">
                                {common("requestUnavailable")}
                              </p>
                            ) : !detail ? (
                              <p className="text-sm text-[var(--rams-gray)]">
                                {common("loading")}
                              </p>
                            ) : (
                              <div className="grid gap-10 pt-2 sm:grid-cols-2">
                                <ServiceDetailList
                                  title={t("companies")}
                                  empty={t("noCompanies")}
                                  items={detail.companies.map((company) => ({
                                    id: company.id ?? company.name,
                                    title: company.name,
                                    description: localized(company.description),
                                  }))}
                                />
                                <ServiceDetailList
                                  title={t("jobs")}
                                  empty={t("noJobs")}
                                  items={detail.jobs.map((job) => ({
                                    id: job.id ?? localized(job.name),
                                    title: localized(job.name),
                                    description: localized(job.description),
                                  }))}
                                />
                              </div>
                            )}
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          </>
        )}
      </PublicContainer>
    </main>
  );
}

function SectionTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--rams-red)]">
        {eyebrow}
      </p>
      <h2 className="mt-3 text-3xl font-bold text-[var(--navy)]">{title}</h2>
    </div>
  );
}

function ServiceDetailList({
  title,
  empty,
  items,
}: {
  title: string;
  empty: string;
  items: Array<{ id: string; title: string; description?: string }>;
}) {
  return (
    <section>
      <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--rams-red)]">
        {title}
      </h3>
      {items.length === 0 ? (
        <p className="mt-4 text-sm text-[var(--gray)]">{empty}</p>
      ) : (
        <ul className="mt-4 space-y-4">
          {items.map((item, index) => (
            <li key={item.id} className="flex gap-3">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center border border-[var(--border)] font-mono text-[0.65rem] font-bold text-[var(--gray)]">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div className="min-w-0">
                <p className="font-semibold text-[var(--navy)]">{item.title}</p>
                {item.description && (
                  <p className="mt-1 text-sm leading-6 text-[var(--slate)]">
                    {item.description}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
