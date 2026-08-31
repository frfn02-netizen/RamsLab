"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { useAuth } from "@/components/providers/auth-providers";
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
import { getUserFacingError } from "@/lib/api/errors";
import { deletePartner, getPartners } from "@/lib/api/modules";
import type { Partner, PartnerType } from "@/types/modules";

function PartnerTable({
  type,
  items,
  admin,
  onDelete,
}: {
  type: PartnerType;
  items: Partner[];
  admin: boolean;
  onDelete: (partner: Partner) => void;
}) {
  if (!items.length) {
    return (
      <EmptyState
        title={`No ${type.toLowerCase()} partners`}
        description="There are no partner records in this category yet."
      />
    );
  }

  return (
    <Card>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left">
          <thead className="border-b border-black/8 bg-[var(--rams-gray-light)]">
            <tr>
              {["Partner", "Country", "Visibility", "Featured", "Action"].map(
                (heading) => (
                  <th
                    key={heading}
                    scope="col"
                    className="px-5 py-4 text-xs font-bold uppercase tracking-wide text-[var(--rams-gray)]"
                  >
                    {heading}
                  </th>
                ),
              )}
            </tr>
          </thead>

          <tbody className="divide-y divide-black/8">
            {items.map((partner) => (
              <tr key={partner._id}>
                <td className="px-5 py-4">
                  <Link
                    href={`/dashboard/partners/${partner._id}?type=${type}`}
                    className="font-semibold hover:text-[var(--rams-red)]"
                  >
                    {partner.name}
                  </Link>

                  <p className="mt-1 text-xs text-[var(--rams-gray)]">
                    {partner.website ?? "Website not provided"}
                  </p>
                </td>

                <td className="px-5 py-4 text-sm">{partner.country ?? "—"}</td>

                <td className="px-5 py-4">
                  <Badge tone={partner.published ? "green" : "neutral"}>
                    {partner.published ? "Published" : "Draft"}
                  </Badge>
                </td>

                <td className="px-5 py-4 text-sm">
                  {partner.isFeatured ? "Yes" : "No"}
                </td>

                <td className="px-5 py-4 text-right">
                  {admin && (
                    <Button variant="danger" onClick={() => onDelete(partner)}>
                      Delete
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

export default function PartnersPage() {
  const { user } = useAuth();

  const [university, setUniversity] = useState<Partner[]>([]);
  const [industrial, setIndustrial] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadPartners() {
      setLoading(true);
      setError(null);

      try {
        const [universities, industries] = await Promise.all([
          getPartners("UNIVERSITY"),
          getPartners("INDUSTRIAL"),
        ]);

        if (!cancelled) {
          setUniversity(universities);
          setIndustrial(industries);
        }
      } catch (reason) {
        if (!cancelled) {
          setError(getUserFacingError(reason));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadPartners();

    return () => {
      cancelled = true;
    };
  }, []);

  async function removePartner(partner: Partner) {
    if (!window.confirm(`Delete “${partner.name}”? This cannot be undone.`)) {
      return;
    }

    try {
      await deletePartner(partner.type, partner._id);

      const update = (items: Partner[]) =>
        items.filter((item) => item._id !== partner._id);

      if (partner.type === "UNIVERSITY") {
        setUniversity(update);
      } else {
        setIndustrial(update);
      }
    } catch (reason) {
      setError(getUserFacingError(reason));
    }
  }

  const isAdmin = user?.role === "ADMIN";

  return (
    <div className="p-5 sm:p-7 lg:p-9">
      <div className="mx-auto max-w-7xl space-y-10">
        <PageHeader
          eyebrow="Collaboration"
          title="Partners"
          description="Manage the university and industrial organizations connected to RAMS."
          action={
            isAdmin ? (
              <LinkButton href="/dashboard/partners/new">
                Add partner
              </LinkButton>
            ) : undefined
          }
        />

        {error && (
          <ErrorState
            message={error}
            onRetry={() => window.location.reload()}
          />
        )}

        {loading ? (
          <Card>
            <LoadingState label="Loading partners" />
          </Card>
        ) : (
          <>
            <section className="space-y-4">
              <div>
                <h2 className="text-xl font-bold">University partners</h2>
                <p className="mt-1 text-sm text-[var(--rams-gray)]">
                  Academic institutions collaborating with RAMS.
                </p>
              </div>

              <PartnerTable
                type="UNIVERSITY"
                items={university}
                admin={isAdmin}
                onDelete={(partner) => void removePartner(partner)}
              />
            </section>

            <section className="space-y-4">
              <div>
                <h2 className="text-xl font-bold">Industrial partners</h2>
                <p className="mt-1 text-sm text-[var(--rams-gray)]">
                  Industry organizations connected to project work.
                </p>
              </div>

              <PartnerTable
                type="INDUSTRIAL"
                items={industrial}
                admin={isAdmin}
                onDelete={(partner) => void removePartner(partner)}
              />
            </section>
          </>
        )}
      </div>
    </div>
  );
}
