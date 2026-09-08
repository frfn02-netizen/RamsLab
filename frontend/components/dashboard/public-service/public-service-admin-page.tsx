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
import {
  deletePublicService,
  deletePublicServiceExpert,
  getPublicPeopleList,
  getPublicServiceExperts,
  getPublicServices,
  updatePublicService,
  updatePublicServiceExpert,
} from "@/lib/api/modules";
import { getUserFacingError } from "@/lib/api/errors";
import type { PublicServiceExpert, PublicServiceRecord } from "@/types/modules";
import type { PublicPerson } from "@/types/people";

export default function PublicServiceAdminPage() {
  const [experts, setExperts] = useState<PublicServiceExpert[]>([]);
  const [services, setServices] = useState<PublicServiceRecord[]>([]);
  const [peopleByKey, setPeopleByKey] = useState<Record<string, PublicPerson>>(
    {},
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [expertList, serviceList, peopleList] = await Promise.all([
        getPublicServiceExperts(),
        getPublicServices(),
        getPublicPeopleList(),
      ]);
      setExperts(expertList);
      setServices(serviceList);
      setPeopleByKey(
        [
          ...peopleList.DOSEN,
          ...peopleList.MAHASISWA,
          ...peopleList.MASTER,
          ...peopleList.UNDERGRADUATE,
          ...peopleList.ALUMNI,
        ].reduce<Record<string, PublicPerson>>((items, person) => {
          items[peopleKeyForPerson(person)] = person;
          return items;
        }, {}),
      );
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

  async function toggleExpert(expert: PublicServiceExpert) {
    setBusyId(expert._id);
    setSuccess(null);
    setError(null);
    try {
      const updated = await updatePublicServiceExpert(expert._id, {
        published: !expert.published,
      });
      setExperts((current) =>
        current.map((item) => (item._id === updated._id ? updated : item)),
      );
      setSuccess(`${expertTitle(updated, peopleByKey)} visibility updated.`);
    } catch (reason) {
      setError(getUserFacingError(reason));
    } finally {
      setBusyId(null);
    }
  }

  async function toggleService(service: PublicServiceRecord) {
    setBusyId(service._id);
    setSuccess(null);
    setError(null);
    try {
      const updated = await updatePublicService(service._id, {
        published: !service.published,
      });
      setServices((current) =>
        current.map((item) => (item._id === updated._id ? updated : item)),
      );
      setSuccess(`${updated.title.en} visibility updated.`);
    } catch (reason) {
      setError(getUserFacingError(reason));
    } finally {
      setBusyId(null);
    }
  }

  async function moveExpert(expert: PublicServiceExpert, direction: -1 | 1) {
    const index = experts.findIndex((item) => item._id === expert._id);
    const other = experts[index + direction];
    if (!other) return;
    setBusyId(expert._id);
    try {
      const [updated, updatedOther] = await Promise.all([
        updatePublicServiceExpert(expert._id, { order: other.order }),
        updatePublicServiceExpert(other._id, { order: expert.order }),
      ]);
      setExperts((current) =>
        current
          .map((item) =>
            item._id === updated._id
              ? updated
              : item._id === updatedOther._id
                ? updatedOther
                : item,
          )
          .sort(
            (a, b) =>
              a.order - b.order ||
              expertTitle(a, peopleByKey).localeCompare(
                expertTitle(b, peopleByKey),
              ),
          ),
      );
      setSuccess("Expert order updated.");
    } catch (reason) {
      setError(getUserFacingError(reason));
    } finally {
      setBusyId(null);
    }
  }

  async function moveService(service: PublicServiceRecord, direction: -1 | 1) {
    const index = services.findIndex((item) => item._id === service._id);
    const other = services[index + direction];
    if (!other) return;
    setBusyId(service._id);
    try {
      const [updated, updatedOther] = await Promise.all([
        updatePublicService(service._id, { order: other.order }),
        updatePublicService(other._id, { order: service.order }),
      ]);
      setServices((current) =>
        current
          .map((item) =>
            item._id === updated._id
              ? updated
              : item._id === updatedOther._id
                ? updatedOther
                : item,
          )
          .sort(
            (a, b) => a.order - b.order || a.title.en.localeCompare(b.title.en),
          ),
      );
      setSuccess("Service order updated.");
    } catch (reason) {
      setError(getUserFacingError(reason));
    } finally {
      setBusyId(null);
    }
  }

  async function removeExpert(expert: PublicServiceExpert) {
    const title = expertTitle(expert, peopleByKey);
    if (!window.confirm(`Remove "${title}" from experts?`)) return;
    setBusyId(expert._id);
    try {
      await deletePublicServiceExpert(expert._id);
      setExperts((current) =>
        current.filter((item) => item._id !== expert._id),
      );
      setSuccess(`${title} was removed.`);
    } catch (reason) {
      setError(getUserFacingError(reason));
    } finally {
      setBusyId(null);
    }
  }

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
          description="Manage experts, service cards, and service detail lists shown on the public Public Service page."
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
          <>
            <section className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-xl font-bold text-[var(--rams-charcoal)]">
                  Our Experts
                </h2>
                <LinkButton href="/dashboard/public-service/experts/new">
                  Add expert
                </LinkButton>
              </div>
              {experts.length === 0 ? (
                <EmptyState
                  title="No experts found"
                  description="Add experts to display them on the Public Service page."
                />
              ) : (
                <Card>
                  <AdminTable
                    rows={experts.map((expert, index) => ({
                      id: expert._id,
                      title: expertTitle(expert, peopleByKey),
                      subtitle: expert.peopleRef
                        ? `${expert.peopleRef.kind} ${expert.peopleRef.id}`
                        : "No People record linked",
                      order: expert.order,
                      published: expert.published,
                      href: `/dashboard/public-service/experts/${expert._id}`,
                      busy: busyId === expert._id,
                      first: index === 0,
                      last: index === experts.length - 1,
                      onUp: () => void moveExpert(expert, -1),
                      onDown: () => void moveExpert(expert, 1),
                      onToggle: () => void toggleExpert(expert),
                      onDelete: () => void removeExpert(expert),
                    }))}
                  />
                </Card>
              )}
            </section>
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
                    rows={services.map((service, index) => ({
                      id: service._id,
                      title: service.title.en,
                      subtitle: service.description?.en || service.code || "",
                      order: service.order,
                      published: service.published,
                      href: `/dashboard/public-service/services/${service._id}`,
                      busy: busyId === service._id,
                      first: index === 0,
                      last: index === services.length - 1,
                      onUp: () => void moveService(service, -1),
                      onDown: () => void moveService(service, 1),
                      onToggle: () => void toggleService(service),
                      onDelete: () => void removeService(service),
                    }))}
                  />
                </Card>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}

function peopleKeyForPerson(person: PublicPerson) {
  return `${kindForPerson(person)}:${person.id}`;
}

function kindForPerson(person: PublicPerson) {
  if (person.category === "ALUMNI") return "ALUMNI";
  if (person.category === "DOSEN") return "DOSEN";
  return "STUDENT";
}

function expertTitle(
  expert: PublicServiceExpert,
  peopleByKey: Record<string, PublicPerson>,
) {
  const key = expert.peopleRef
    ? `${expert.peopleRef.kind}:${expert.peopleRef.id}`
    : "";
  return peopleByKey[key]?.fullName ?? expert.displayName ?? "Linked expert";
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
    first: boolean;
    last: boolean;
    onUp: () => void;
    onDown: () => void;
    onToggle: () => void;
    onDelete: () => void;
  }>;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[900px] text-left">
        <thead className="border-b border-black/8 bg-[var(--rams-gray-light)]">
          <tr>
            {["Title", "Order", "Visibility", "Action"].map((heading) => (
              <th
                key={heading}
                className="px-5 py-4 text-xs font-bold uppercase tracking-wide text-[var(--rams-gray)] last:text-center"
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
                <div className="flex flex-wrap justify-center gap-2">
                  <Button
                    variant="secondary"
                    disabled={row.busy || row.first}
                    onClick={row.onUp}
                  >
                    Up
                  </Button>
                  <Button
                    variant="secondary"
                    disabled={row.busy || row.last}
                    onClick={row.onDown}
                  >
                    Down
                  </Button>
                  <Button
                    variant="secondary"
                    disabled={row.busy}
                    onClick={row.onToggle}
                  >
                    {row.published ? "Unpublish" : "Publish"}
                  </Button>
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
