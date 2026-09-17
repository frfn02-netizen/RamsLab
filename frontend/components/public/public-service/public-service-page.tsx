"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  getPublicExperts,
  getPublicServiceProjectsList,
} from "@/lib/api/modules";
import type {
  Expert,
  PublicServiceProjectPageItem,
  PublicServiceProjectFacets,
} from "@/types/modules";
import PageHero from "../page-hero";
import PublicContainer from "../public-container";

function ExpertCard({ expert }: { expert: Expert }) {
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <Link
      href={`/experts/${expert._id}`}
      className="group flex h-full min-w-0 flex-col border border-[var(--border)] bg-white transition hover:border-[var(--rams-red)] hover:shadow-md"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-[var(--navy)]">
        {expert.photo && !imageFailed ? (
          <Image
            src={expert.photo}
            alt={expert.name}
            fill
            onError={() => setImageFailed(true)}
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1280px) 33vw, 25vw"
          />
        ) : (
          <div className="grid h-full place-items-center text-5xl font-semibold text-white/85">
            {expert.name
              .split(/\s+/)
              .filter(Boolean)
              .slice(0, 2)
              .map((w) => w[0]?.toUpperCase())
              .join("")}
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col items-center p-5 text-center">
        <h3 className="font-display text-lg font-semibold leading-tight tracking-[-0.02em] text-[var(--navy)] transition-colors group-hover:text-[var(--rams-red)]">
          {expert.name}
        </h3>
        {expert.specialization.length > 0 && (
          <p className="mt-2 text-sm leading-5 text-[var(--gray)]">
            {expert.specialization.join(", ")}
          </p>
        )}
      </div>
    </Link>
  );
}

export default function PublicServicePage() {
  const locale = useLocale() === "id" ? "id" : "en";
  const t = useTranslations("publicService");
  const common = useTranslations("common");
  const [experts, setExperts] = useState<Expert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    getPublicExperts()
      .then(setExperts)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main>
      <PageHero
        eyebrow=""
        title={t("title")}
        description={t("description")}
      />
      <PublicContainer className="space-y-16 py-16 sm:py-20">
        {loading ? (
          <p className="text-sm font-semibold text-[var(--rams-gray)]">
            {common("loading")}
          </p>
        ) : error ? (
          <p className="text-sm font-semibold text-red-700">
            {common("requestUnavailable")}
          </p>
        ) : (
          <>
            {experts.length > 0 && (
              <section>
                <SectionTitle
                  eyebrow=""
                  title={t("expertsTitle")}
                />
                <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {experts.map((expert) => (
                    <ExpertCard key={expert._id} expert={expert} />
                  ))}
                </div>
              </section>
            )}
          </>
        )}

        <ProjectsSection locale={locale} />
      </PublicContainer>
    </main>
  );
}

function SectionTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div>
      {eyebrow ? <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--rams-red)]">{eyebrow}</p> : null}
      <h2 className={`${eyebrow ? "mt-3" : ""} text-3xl font-bold text-[var(--navy)]`}>{title}</h2>
    </div>
  );
}

const PROJECTS_PER_PAGE = 10;

function ProjectsSection({ locale }: { locale: "en" | "id" }) {
  const t = useTranslations("publicService");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [yearGroup, setYearGroup] = useState<string | undefined>();
  const [client, setClient] = useState<string | undefined>();
  const [sort, setSort] = useState<"newest" | "oldest">("newest");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<PublicServiceProjectPageItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [facets, setFacets] = useState<PublicServiceProjectFacets | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queryRef = useRef({ search, yearGroup, client, sort, page });
  const localized = (value?: { en: string; id: string }) =>
    value?.[locale] || value?.en || value?.id || "";

  useEffect(() => {
    queryRef.current = { search, yearGroup, client, sort, page };
  });

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      try {
        const q = queryRef.current;
        const res = await getPublicServiceProjectsList({
          search: q.search,
          yearGroup: q.yearGroup,
          client: q.client,
          sort: q.sort,
          page: q.page,
          limit: PROJECTS_PER_PAGE,
        });
        if (cancelled) return;
        setItems(res.data ?? []);
        setTotal(res.total ?? 0);
        setFacets(res.facets ?? null);
      } catch {
        if (!cancelled) {
          setItems([]);
          setTotal(0);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [search, yearGroup, client, sort, page]);

  function handleSearchChange(value: string) {
    setSearchInput(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearch(value.trim());
      setPage(1);
    }, 350);
  }

  const totalPages = Math.max(1, Math.ceil(total / PROJECTS_PER_PAGE));

  return (
    <section>
      <SectionTitle eyebrow="" title={t("projectsTitle")} />

      <div className="mt-8 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            type="text"
            placeholder={t("projectsSearchPlaceholder")}
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full rounded-md border border-[var(--border)] bg-white px-4 py-2.5 text-sm text-[var(--navy)] outline-none transition placeholder:text-[var(--gray)] focus:border-[var(--rams-red)] focus:ring-2 focus:ring-red-100 sm:max-w-xs"
          />
          <select
            value={sort}
            onChange={(e) => {
              setSort(e.target.value as "newest" | "oldest");
              setPage(1);
            }}
            className="rounded-md border border-[var(--border)] bg-white px-3 py-2.5 text-sm text-[var(--navy)] outline-none focus:border-[var(--rams-red)]"
          >
            <option value="newest">{t("projectsSortNewest")}</option>
            <option value="oldest">{t("projectsSortOldest")}</option>
          </select>
        </div>

        <div className="flex flex-wrap gap-3">
          {facets && facets.yearGroups.length > 0 && (
            <select
              value={yearGroup ?? ""}
              onChange={(e) => {
                setYearGroup(e.target.value || undefined);
                setPage(1);
              }}
              className="rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm text-[var(--navy)] outline-none focus:border-[var(--rams-red)]"
            >
              <option value="">{t("projectsFilterYear")}</option>
              {facets.yearGroups.map((yg) => (
                <option key={yg} value={yg}>
                  {yg}
                </option>
              ))}
            </select>
          )}
          {facets && facets.clients.length > 0 && (
            <select
              value={client ?? ""}
              onChange={(e) => {
                setClient(e.target.value || undefined);
                setPage(1);
              }}
              className="rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm text-[var(--navy)] outline-none focus:border-[var(--rams-red)]"
            >
              <option value="">{t("projectsFilterClient")}</option>
              {facets.clients.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          )}
        </div>

        {loading ? (
          <p className="py-8 text-sm font-semibold text-[var(--rams-gray)]">
            {t("projectsLoading")}
          </p>
        ) : items.length === 0 ? (
          <p className="py-8 text-sm font-semibold text-[var(--rams-gray)]">
            {t("projectsEmpty")}
          </p>
        ) : (
          <>
            <div className="hidden overflow-x-auto border border-[var(--border)] bg-white md:block">
              <table className="w-full min-w-[600px] text-left">
                <thead className="border-b border-[var(--border)] bg-[var(--background-light)]">
                  <tr>
                    {[
                      t("projectsTableNo"),
                      t("projectsTableTitle"),
                      t("projectsTableClient"),
                      t("projectsTablePeriod"),
                    ].map((heading) => (
                      <th
                        key={heading}
                        className="px-5 py-3.5 text-xs font-bold uppercase tracking-wide text-[var(--gray)]"
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {items.map((project, index) => (
                    <tr
                      key={project.id}
                      className="transition hover:bg-[var(--background-light)]"
                    >
                      <td className="px-5 py-4 text-sm text-[var(--charcoal)]">
                        {(page - 1) * PROJECTS_PER_PAGE + index + 1}
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-semibold text-[var(--navy)]">
                          {localized(project.title)}
                        </p>
                      </td>
                      <td className="px-5 py-4 text-sm text-[var(--charcoal)]">
                        {project.client}
                      </td>
                      <td className="px-5 py-4 text-sm text-[var(--charcoal)]">
                        {project.period || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="space-y-4 md:hidden">
              {items.map((project, index) => (
                <article
                  key={project.id}
                  className="border border-[var(--border)] bg-white p-5"
                >
                  <div className="flex items-start gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center bg-[var(--background-light)] text-xs font-bold text-[var(--charcoal)]">
                      {(page - 1) * PROJECTS_PER_PAGE + index + 1}
                    </span>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-[var(--navy)]">
                        {localized(project.title)}
                      </h3>
                      <dl className="mt-3 space-y-1 text-sm text-[var(--charcoal)]">
                        <div className="flex gap-2">
                          <dt className="font-semibold">
                            {t("projectsTableClient")}:
                          </dt>
                          <dd>{project.client}</dd>
                        </div>
                        <div className="flex gap-2">
                          <dt className="font-semibold">
                            {t("projectsTablePeriod")}:
                          </dt>
                          <dd>{project.period || "—"}</dd>
                        </div>
                      </dl>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-[var(--border)] pt-4">
                <p className="text-sm text-[var(--gray)]">
                  {t("projectsPageOf", { page, totalPages })}
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={page === 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="rounded-md border border-[var(--border)] bg-white px-4 py-2 text-sm font-semibold text-[var(--navy)] transition hover:bg-[var(--background-light)] disabled:opacity-40"
                  >
                    {t("projectsPrev")}
                  </button>
                  <button
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="rounded-md border border-[var(--border)] bg-white px-4 py-2 text-sm font-semibold text-[var(--navy)] transition hover:bg-[var(--background-light)] disabled:opacity-40"
                  >
                    {t("projectsNext")}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
