"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { useAuth } from "@/components/providers/auth-providers";
import { Badge, Button, Card, ErrorState, LoadingState } from "@/components/ui";
import DeleteConfirmationModal from "@/components/dashboard/delete-confirmation-modal";
import { deleteDosen, getDosenById } from "@/lib/api/modules";
import { getUserFacingError } from "@/lib/api/errors";
import type { Dosen } from "@/types/modules";

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card className="p-6">
      <h2 className="text-lg font-bold">{title}</h2>
      <div className="mt-5">{children}</div>
    </Card>
  );
}

export default function DosenDetail({ id }: { id: string }) {
  const { user } = useAuth();
  const router = useRouter();
  const [dosen, setDosen] = useState<Dosen | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getDosenById(id)
      .then((result) => {
        if (!cancelled) setDosen(result);
      })
      .catch((reason) => {
        if (!cancelled) setError(getUserFacingError(reason));
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function confirmDelete() {
    if (!dosen) return;
    setDeleting(true);
    try {
      await deleteDosen(dosen._id);
      router.push("/dashboard/dosen");
    } catch (reason) {
      setError(getUserFacingError(reason));
      setDeleting(false);
      setPendingDelete(false);
    }
  }

  if (!dosen && !error)
    return (
      <div className="p-5 sm:p-7 lg:p-9">
        <LoadingState label="Loading dosen" />
      </div>
    );
  if (error && !dosen)
    return (
      <div className="p-5 sm:p-7 lg:p-9">
        <ErrorState message={error} />
        <Link
          href="/dashboard/dosen"
          className="mt-5 inline-block font-bold text-[var(--rams-red)]"
        >
          ← Back to Dosen
        </Link>
      </div>
    );
  if (!dosen) return null;

  return (
    <div className="p-5 sm:p-7 lg:p-9">
      {pendingDelete && (
        <DeleteConfirmationModal
          personType="dosen"
          personName={dosen.fullName}
          deleting={deleting}
          onCancel={() => setPendingDelete(false)}
          onConfirm={() => void confirmDelete()}
        />
      )}
      <div className="mx-auto max-w-5xl space-y-7">
        <Link
          href="/dashboard/dosen"
          className="text-sm font-bold text-[var(--rams-red)]"
        >
          ← Back to Dosen
        </Link>
        {error && <ErrorState message={error} />}
        <Card className="p-6 sm:p-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 flex-col gap-5 sm:flex-row">
              <div className="relative h-32 w-32 shrink-0 overflow-hidden bg-[var(--rams-charcoal)]">
                {dosen.photo ? (
                  <>
                    <span className="sr-only">Profile photo</span>
                    <Image
                      src={dosen.photo}
                      alt={dosen.fullName}
                      fill
                      className="object-cover"
                      sizes="128px"
                    />
                  </>
                ) : (
                  <div className="grid h-full place-items-center text-4xl font-semibold text-white/85">
                    {initials(dosen.fullName)}
                  </div>
                )}
              </div>
              <div>
                <Badge tone={dosen.isPublic ? "green" : "neutral"}>
                  {dosen.isPublic ? "Public" : "Private"}
                </Badge>
                <h1 className="mt-4 font-display text-4xl font-semibold tracking-[-0.04em] text-[var(--rams-charcoal)]">
                  {dosen.fullName}
                </h1>
                {(dosen.title || dosen.position) && (
                  <p className="mt-2 text-lg text-[var(--rams-gray)]">
                    {[dosen.title, dosen.position].filter(Boolean).join(" · ")}
                  </p>
                )}
                {(dosen.faculty || dosen.department) && (
                  <p className="mt-2 text-sm text-[var(--rams-gray)]">
                    {[dosen.faculty, dosen.department]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                )}
              </div>
            </div>
            {user?.role === "ADMIN" && (
              <div className="flex shrink-0 gap-2">
                <Link
                  href={`/dashboard/dosen/${dosen._id}/edit`}
                  className="inline-flex items-center justify-center rounded-md bg-[var(--rams-red)] px-4 py-2 text-sm font-semibold text-white"
                >
                  Edit Dosen
                </Link>
                <Button
                  variant="danger"
                  onClick={() => setPendingDelete(true)}
                  disabled={deleting}
                >
                  Delete
                </Button>
              </div>
            )}
          </div>
        </Card>

        {(dosen.employeeId || dosen.nip || dosen.nidn) && (
          <Section title="Identity">
            <div className="grid gap-6 sm:grid-cols-3">
              {[
                ["Employee ID", dosen.employeeId],
                ["NIP", dosen.nip],
                ["NIDN", dosen.nidn],
              ].map(([label, value]) =>
                value ? (
                  <div key={label}>
                    <p className="text-xs font-bold uppercase tracking-wide text-[var(--rams-gray)]">
                      {label}
                    </p>
                    <p className="mt-2">{value}</p>
                  </div>
                ) : null,
              )}
            </div>
          </Section>
        )}
        {(dosen.email || dosen.phone || dosen.linkedin) && (
          <Section title="Contact">
            <div className="grid gap-6 sm:grid-cols-3">
              {dosen.email && (
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-[var(--rams-gray)]">
                    Email
                  </p>
                  <p className="mt-2 break-words">{dosen.email}</p>
                </div>
              )}
              {dosen.phone && (
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-[var(--rams-gray)]">
                    Phone
                  </p>
                  <p className="mt-2">{dosen.phone}</p>
                </div>
              )}
              {dosen.linkedin && (
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-[var(--rams-gray)]">
                    LinkedIn
                  </p>
                  <a
                    href={dosen.linkedin}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 block font-semibold text-[var(--rams-red)]"
                  >
                    Open profile ↗
                  </a>
                </div>
              )}
            </div>
          </Section>
        )}
        {(dosen.faculty ||
          dosen.department ||
          dosen.institution ||
          dosen.program) && (
          <Section title="Academic Information">
            <div className="grid gap-6 sm:grid-cols-2">
              {[
                ["Faculty", dosen.faculty],
                ["Department", dosen.department],
                ["Institution", dosen.institution],
                ["Program", dosen.program],
              ].map(([label, value]) =>
                value ? (
                  <div key={label}>
                    <p className="text-xs font-bold uppercase tracking-wide text-[var(--rams-gray)]">
                      {label}
                    </p>
                    <p className="mt-2">{value}</p>
                  </div>
                ) : null,
              )}
            </div>
          </Section>
        )}
        {dosen.specialization.length > 0 && (
          <Section title="Specializations">
            <div className="flex flex-wrap gap-2">
              {dosen.specialization.map((value) => (
                <Badge key={value}>{value}</Badge>
              ))}
            </div>
          </Section>
        )}
        {dosen.bio && (
          <Section title="Biography">
            <p className="whitespace-pre-wrap leading-7">{dosen.bio}</p>
          </Section>
        )}
        {dosen.education && dosen.education.length > 0 && (
          <Section title="Education">
            <div className="space-y-5">
              {dosen.education.map((item, index) => (
                <div
                  key={`${item.degree}-${item.institution}-${index}`}
                  className="border-l-2 border-[var(--rams-red)] pl-5"
                >
                  <p className="font-semibold">{item.degree}</p>
                  <p className="mt-1 text-sm text-[var(--rams-gray)]">
                    {item.field} · {item.institution}
                  </p>
                  {(item.startYear || item.endYear) && (
                    <p className="mt-2 text-xs font-bold uppercase tracking-wide text-[var(--rams-gray)]">
                      {item.startYear ?? "—"} — {item.endYear ?? "Present"}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </Section>
        )}
        {(dosen.sintaUrl ||
          dosen.googleScholarUrl ||
          dosen.scopusUrl ||
          dosen.orcidUrl) && (
          <Section title="Academic Profiles">
            <div className="flex flex-wrap gap-4">
              {[
                ["SINTA", dosen.sintaUrl],
                ["Google Scholar", dosen.googleScholarUrl],
                ["Scopus", dosen.scopusUrl],
                ["ORCID", dosen.orcidUrl],
              ].map(([label, value]) =>
                value ? (
                  <a
                    key={label}
                    href={value}
                    target="_blank"
                    rel="noreferrer"
                    className="font-semibold text-[var(--rams-red)]"
                  >
                    {label} ↗
                  </a>
                ) : null,
              )}
            </div>
          </Section>
        )}
        {(dosen.hIndex !== undefined ||
          dosen.publicationCount !== undefined ||
          dosen.projectCount !== undefined ||
          dosen.awardCount !== undefined) && (
          <Section title="Statistics">
            <div className="grid gap-6 sm:grid-cols-4">
              {[
                ["h-index", dosen.hIndex],
                ["Publications", dosen.publicationCount],
                ["Projects", dosen.projectCount],
                ["Awards", dosen.awardCount],
              ].map(([label, value]) =>
                value !== undefined ? (
                  <div key={label}>
                    <p className="text-xs font-bold uppercase tracking-wide text-[var(--rams-gray)]">
                      {label}
                    </p>
                    <p className="mt-2 text-2xl font-semibold">{value}</p>
                  </div>
                ) : null,
              )}
            </div>
          </Section>
        )}
        <Section title="Visibility">
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              ["Show NIP", dosen.showNip],
              ["Show NIDN", dosen.showNidn],
              ["Show email", dosen.showEmail],
              ["Public profile", dosen.isPublic],
            ].map(([label, value]) => (
              <div
                key={String(label)}
                className="flex items-center justify-between border-b border-black/8 pb-3 text-sm"
              >
                <span>{label}</span>
                <Badge tone={value ? "green" : "neutral"}>
                  {value ? "Yes" : "No"}
                </Badge>
              </div>
            ))}
          </div>
        </Section>
      </div>
    </div>
  );
}
