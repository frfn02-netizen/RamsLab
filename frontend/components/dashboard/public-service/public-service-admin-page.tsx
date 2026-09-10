"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  LinkButton,
  LoadingState,
  PageHeader,
} from "@/components/ui";
import { deletePublicService, getPublicServices } from "@/lib/api/modules";
import { getUserFacingError } from "@/lib/api/errors";
import type { PublicServiceRecord } from "@/types/modules";

export default function PublicServiceAdminPage() {
  const [services, setServices] = useState<PublicServiceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const serviceList = await getPublicServices();
      setServices(serviceList);
    } catch (reason) {
      setError(getUserFacingError(reason));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function removeService(service: PublicServiceRecord) {
    if (
      !window.confirm(`Delete "${service.title.en}"? This cannot be undone.`)
    ) {
      return;
    }
    setBusyId(service._id);
    try {
      await deletePublicService(service._id);
      setServices((current) =>
        current.filter((item) => item._id !== service._id),
      );
      setSuccess(`${service.title.en} was deleted.`);
    } catch (reason) {
      setError(getUserFacingError(reason));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="p-5 sm:p-7 lg:p-9">
      <div className="mx-auto max-w-7xl space-y-7">
        <PageHeader
          eyebrow="CMS"
          title="Public Service"
          description="Manage service cards and service detail lists shown on the public Public Service page."
        />
        {error && <ErrorState message={error} onRetry={() => void load()} />}
        {success && (
          <div className="border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">
            {success}
          </div>
        )}
        {loading ? (
          <Card>
            <LoadingState label="Loading public service content" />
          </Card>
        ) : (
          <section className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-xl font-bold text-[var(--rams-charcoal)]">
                Public Services
              </h2>
              <LinkButton href="/dashboard/public-service/services/new">
                Add service
              </LinkButton>
            </div>
            {services.length === 0 ? (
              <EmptyState
                title="No services found"
                description="Add services to display them on the Public Service page."
              />
            ) : (
              <Card>
                <AdminTable
                  rows={services.map((service) => ({
                    id: service._id,
                    title: service.title.en,
                    subtitle: service.description?.en || service.code || "",
                    order: service.order,
                    published: service.published,
                    href: `/dashboard/public-service/services/${service._id}`,
                    busy: busyId === service._id,
                    onDelete: () => void removeService(service),
                  }))}
                />
              </Card>
            )}
          </section>
        )}
      </div>
    </div>
  );
}

function AdminTable({
  rows,
}: {
  rows: Array<{
    id: string;
    title: string;
    subtitle: string;
    order: number;
    published: boolean;
    href: string;
    busy: boolean;
    onDelete: () => void;
  }>;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[700px] text-left">
        <thead className="border-b border-black/8 bg-[var(--rams-gray-light)]">
          <tr>
            {["Title", "Order", "Visibility", "Action"].map((heading) => (
              <th
                key={heading}
                className={`px-5 py-4 text-xs font-bold uppercase tracking-wide text-[var(--rams-gray)] ${heading === "Action" ? "text-center" : ""}`}
              >
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-black/8">
          {rows.map((row) => (
            <tr key={row.id}>
              <td className="px-5 py-4">
                <Link
                  href={row.href}
                  className="font-semibold hover:text-[var(--rams-red)]"
                >
                  {row.title}
                </Link>
                {row.subtitle && (
                  <p className="mt-1 text-xs text-[var(--rams-gray)]">
                    {row.subtitle}
                  </p>
                )}
              </td>
              <td className="px-5 py-4 text-sm">{row.order}</td>
              <td className="px-5 py-4">
                <Badge tone={row.published ? "green" : "neutral"}>
                  {row.published ? "Published" : "Draft"}
                </Badge>
              </td>
              <td className="px-5 py-4">
                <div className="flex items-center justify-center gap-2">
                  <LinkButton href={row.href} variant="secondary">
                    Edit
                  </LinkButton>
                  <Button
                    variant="danger"
                    disabled={row.busy}
                    onClick={row.onDelete}
                  >
                    Delete
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
