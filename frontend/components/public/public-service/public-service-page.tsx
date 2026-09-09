"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { getPublicServicePage, getPublicExperts } from "@/lib/api/modules";
import type { PublicServicePageData, Expert } from "@/types/modules";
import PageHero from "../page-hero";
import PublicContainer from "../public-container";
import RevealOnScroll from "../reveal-on-scroll";

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
            unoptimized
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
  const [data, setData] = useState<PublicServicePageData | null>(null);
  const [experts, setExperts] = useState<Expert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const localized = (value?: { en: string; id: string }) =>
    value?.[locale] || value?.en || value?.id || "";

  useEffect(() => {
    Promise.all([getPublicServicePage(), getPublicExperts()])
      .then(([serviceData, expertData]) => {
        setData(serviceData);
        setExperts(expertData);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

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
        ) : error ? (
          <p className="text-sm font-semibold text-red-700">
            {common("requestUnavailable")}
          </p>
        ) : (
          <>
            {experts.length > 0 && (
              <section>
                <SectionTitle
                  eyebrow={t("expertsEyebrow")}
                  title={t("expertsTitle")}
                />
                <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {experts.map((expert) => (
                    <ExpertCard key={expert._id} expert={expert} />
                  ))}
                </div>
              </section>
            )}

            {data && data.services.length > 0 && (
              <section>
                <SectionTitle
                  eyebrow={t("servicesEyebrow")}
                  title={t("servicesTitle")}
                />
                <div className="mt-10 space-y-16">
                  {data.services.map((service, index) => {
                    const title = localized(service.title);
                    const description = localized(service.description);
                    const hasImages =
                      service.images && service.images.length > 0;
                    const isEven = index % 2 === 0;

                    return (
                      <RevealOnScroll key={service.id} stagger={80}>
                        <article
                          className={`grid items-start gap-10 lg:grid-cols-2 lg:gap-20 ${index > 0 ? "border-t border-[var(--border)] pt-16" : ""}`}
                        >
                          <div
                            className={`${isEven ? "order-1" : "order-1 lg:order-2"}`}
                          >
                            <span className="font-display text-sm font-bold text-[var(--rams-red)]">
                              {String(index + 1).padStart(2, "0")}
                            </span>

                            {title && (
                              <h3 className="mt-4 font-display text-3xl font-bold leading-tight tracking-[-0.02em] text-[var(--navy)] sm:text-4xl">
                                {title}
                              </h3>
                            )}

                            {description && (
                              <p className="mt-6 max-w-xl text-base leading-7 text-[var(--gray)] sm:text-lg">
                                {description}
                              </p>
                            )}
                          </div>

                          <div
                            className={`${isEven ? "order-2" : "order-2 lg:order-1"}`}
                          >
                            {hasImages ? (
                              <div className="grid grid-cols-2 gap-3">
                                {service.images.map((url, imgIndex) => (
                                  <div
                                    key={`${service.id}-${imgIndex}`}
                                    className="relative aspect-[4/3] overflow-hidden border border-[var(--border)]"
                                  >
                                    <Image
                                      src={url}
                                      alt={`${title || `Service ${index + 1}`} - Documentation ${imgIndex + 1}`}
                                      fill
                                      unoptimized
                                      sizes="(max-width: 1024px) 50vw, 25vw"
                                      className="object-cover"
                                    />
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="flex aspect-[4/3] items-center justify-center border border-dashed border-[var(--border)] bg-[var(--background-light)]">
                                <span className="font-display text-7xl font-bold tracking-tight text-[var(--navy)]/10">
                                  {String(index + 1).padStart(2, "0")}
                                </span>
                              </div>
                            )}
                          </div>
                        </article>
                      </RevealOnScroll>
                    );
                  })}
                </div>
              </section>
            )}
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
