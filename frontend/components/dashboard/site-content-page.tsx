"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Card, ErrorState, LoadingState, PageHeader } from "@/components/ui";
import { getAdminSiteContentList } from "@/lib/api/modules";
import { getUserFacingError } from "@/lib/api/errors";
import type {
  SiteContentAdminEnvelope,
  SiteContentKey,
} from "@/types/site-content";

const pageDetails: Record<
  SiteContentKey,
  { title: string; description: string }
> = {
  homepage: {
    title: "Homepage",
    description:
      "Hero, principles, research, projects, ecosystem, and collaboration copy.",
  },
  about: {
    title: "About",
    description:
      "Laboratory profile, research approach, focus, ecosystem, and CTA copy.",
  },
  contact: {
    title: "Contact",
    description:
      "Contact hero, contact details, homepage contact preview, and collaboration copy.",
  },
  footer: {
    title: "Footer",
    description:
      "Footer description, contact details, address, copyright, and institution copy.",
  },
};

export default function SiteContentPage() {
  const [content, setContent] = useState<SiteContentAdminEnvelope[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getAdminSiteContentList()
      .then((result) => {
        if (!cancelled) setContent(result);
      })
      .catch((reason) => {
        if (!cancelled) setError(getUserFacingError(reason));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="p-5 sm:p-7 lg:p-9">
      <div className="mx-auto max-w-6xl space-y-7">
        <PageHeader
          eyebrow="CMS"
          title="Site Content"
          description="Edit the bilingual copy used by the public website."
        />
        {error && <ErrorState message={error} />}
        {loading ? (
          <Card>
            <LoadingState label="Loading site content" />
          </Card>
        ) : (
          <div className="grid gap-5 md:grid-cols-2">
            {(Object.keys(pageDetails) as SiteContentKey[]).map((key) => {
              const record = content.find((item) => item.key === key);
              const details = pageDetails[key];
              return (
                <Card key={key} className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--rams-red)]">
                        {key}
                      </p>
                      <h2 className="mt-2 text-2xl font-bold text-[var(--rams-charcoal)]">
                        {details.title}
                      </h2>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${record ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-800"}`}
                    >
                      {record ? "Saved" : "Missing"}
                    </span>
                  </div>
                  <p className="mt-4 text-sm leading-6 text-[var(--rams-gray)]">
                    {details.description}
                  </p>
                  <p className="mt-4 text-xs text-[var(--rams-gray)]">
                    {record
                      ? `Last saved ${new Date(record.updatedAt).toLocaleString()}`
                      : "Run the site content migration to create this record."}
                  </p>
                  <Link
                    href={`/dashboard/content/${key}`}
                    className="mt-6 inline-flex min-h-10 items-center justify-center rounded-md bg-[var(--rams-red)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--rams-red-dark)]"
                  >
                    Edit {details.title}
                  </Link>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
