"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";

import { useAuth } from "@/components/providers/auth-providers";
import RejectAlumniModal from "@/components/dashboard/reject-alumni-modal";
import {
  Badge,
  Button,
  Card,
  ErrorState,
  Field,
  LoadingState,
  inputClass,
} from "@/components/ui";
import {
  getAlumniById,
  reviewAlumni,
  setAlumniActive,
  updateAlumni,
} from "@/lib/api/alumni";
import { getTrackingByAlumniId } from "@/lib/api/modules";
import { getUserFacingError } from "@/lib/api/errors";
import {
  formatMissingPublishFields,
  getMissingPublishFields,
} from "@/lib/alumni-publish";
import { safeHttpUrl } from "@/lib/safe-url";
import type { Alumni, AlumniStatus } from "@/types/alumni";
import type { AlumniTracking } from "@/types/modules";

const statuses: AlumniStatus[] = [
  "WORKING",
  "STUDYING",
  "ENTREPRENEUR",
  "SEEKING_JOB",
  "OTHER",
];

const label = (value: string) =>
  value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const dateLabel = (value: string) => {
  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("en", {
        dateStyle: "medium",
      }).format(date);
};

export default function AlumniDetail({ id }: { id: string }) {
  const { user } = useAuth();

  const [alumni, setAlumni] = useState<Alumni | null>(null);
  const [tracking, setTracking] = useState<AlumniTracking[]>([]);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accountUpdating, setAccountUpdating] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);

  const [form, setForm] = useState({
    fullName: "",
    angkatan: "",
    program: "",
    currentStatus: "WORKING" as AlumniStatus,
    phone: "",
    location: "",
    currentCompany: "",
    currentPosition: "",
    linkedin: "",
    bio: "",
    isPublic: false,
  });

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      try {
        const [profile, events] = await Promise.all([
          getAlumniById(id),
          getTrackingByAlumniId(id),
        ]);

        if (!cancelled) {
          const safeLinkedin = safeHttpUrl(profile.linkedin) ?? undefined;

          const safeProfile = {
            ...profile,
            linkedin: safeLinkedin,
          };

          setAlumni(safeProfile);
          setTracking(events);

          setForm({
            fullName: profile.fullName,
            angkatan: String(profile.angkatan),
            program: profile.program,
            currentStatus: profile.currentStatus,
            phone: profile.phone ?? "",
            location: profile.location ?? "",
            currentCompany: profile.currentCompany ?? "",
            currentPosition: profile.currentPosition ?? "",
            linkedin: safeLinkedin ?? "",
            bio: profile.bio ?? "",
            isPublic: profile.isPublic,
          });
        }
      } catch (reason) {
        if (!cancelled) {
          setError(getUserFacingError(reason));
        }
      }
    }

    void loadProfile();

    return () => {
      cancelled = true;
    };
  }, [id]);

  const update = (key: string, value: string | boolean) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  };

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const result = await updateAlumni(id, {
        fullName: form.fullName,
        angkatan: Number(form.angkatan),
        program: form.program,
        currentStatus: form.currentStatus,
        phone: form.phone || undefined,
        location: form.location || undefined,
        currentCompany: form.currentCompany || undefined,
        currentPosition: form.currentPosition || undefined,
        linkedin: form.linkedin || undefined,
        bio: form.bio || undefined,
        isPublic: form.isPublic,
      });

      setAlumni(result);
      setEditing(false);
    } catch (reason) {
      setError(getUserFacingError(reason));
    } finally {
      setSaving(false);
    }
  }

  async function toggleAccount() {
    setAccountUpdating(true);
    setError(null);
    const shouldEnable = alumni?.accountActive === false;
    try {
      await setAlumniActive(id, shouldEnable);
      setAlumni((current) =>
        current ? { ...current, accountActive: shouldEnable } : current,
      );
    } catch (reason) {
      setError(getUserFacingError(reason));
    } finally {
      setAccountUpdating(false);
    }
  }

  async function review(action: "APPROVE" | "REJECT", rejectReason?: string) {
    setReviewing(true);
    setError(null);
    try {
      setAlumni(
        action === "REJECT"
          ? await reviewAlumni(id, "REJECT", rejectReason)
          : await reviewAlumni(id, "APPROVE"),
      );
    } catch (reason) {
      setError(getUserFacingError(reason));
    } finally {
      setReviewing(false);
      // The modal closes for both outcomes so the page-level error (e.g. a
      // server refusal) is never hidden behind it.
      setRejectOpen(false);
    }
  }

  if (!alumni && !error) {
    return (
      <div className="p-5 sm:p-7 lg:p-9">
        <LoadingState label="Loading alumni profile" />
      </div>
    );
  }

  if (error && !alumni) {
    return (
      <div className="p-5 sm:p-7 lg:p-9">
        <ErrorState message={error} />

        <Link
          href="/team"
          className="mt-5 inline-block text-sm font-bold text-[var(--rams-red)]"
        >
          ← Back to alumni
        </Link>
      </div>
    );
  }

  if (!alumni) {
    return null;
  }

  const missingFields = getMissingPublishFields(alumni);

  return (
    <div className="p-5 sm:p-7 lg:p-9">
      <div className="mx-auto max-w-5xl space-y-8">
        <Link
          href="/dashboard/alumni"
          className="text-sm font-bold text-[var(--rams-red)]"
        >
          ← All alumni
        </Link>

        {error && <ErrorState message={error} />}
        <div className="flex flex-wrap gap-2">
          <Badge tone={alumni.accountActive === false ? "amber" : "green"}>
            {alumni.accountActive === false ? "Disabled" : "Active"}
          </Badge>
          {/* Review status is the workflow state; profile completeness is
              only ever shown as supporting information below. */}
          <Badge
            tone={
              alumni.reviewStatus === "APPROVED"
                ? "green"
                : alumni.reviewStatus === "REJECTED"
                  ? "amber"
                  : "neutral"
            }
          >
            {alumni.reviewStatus === "APPROVED"
              ? "Approved"
              : alumni.reviewStatus === "REJECTED"
                ? "Rejected"
                : "Pending review"}
          </Badge>
          <Badge tone={alumni.isPublic ? "green" : "neutral"}>
            {alumni.isPublic ? "Public" : "Private"}
          </Badge>
          {alumni.accountEmail && (
            <span className="text-sm text-[var(--rams-gray)]">
              {alumni.accountEmail}
            </span>
          )}
        </div>
        {missingFields.length > 0 && (
          <p className="border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
            Missing before publish:{" "}
            <strong>{formatMissingPublishFields(missingFields)}</strong>. The
            review status stays &ldquo;
            {alumni.reviewStatus === "APPROVED"
              ? "Approved"
              : alumni.reviewStatus === "REJECTED"
                ? "Rejected"
                : "Pending review"}
            &rdquo; and Approve &amp; publish is refused by the server until the
            alumni fills them in.
          </p>
        )}

        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <Badge
                tone={
                  alumni.currentStatus === "SEEKING_JOB" ? "amber" : "neutral"
                }
              >
                {label(alumni.currentStatus)}
              </Badge>

              <span className="text-sm text-[var(--rams-gray)]">
                NIM {alumni.nim}
              </span>
            </div>

            <h1 className="mt-4 text-4xl font-bold">
              {alumni.fullName || "Alumni Account"}
            </h1>

            <p className="mt-2 text-[var(--rams-gray)]">
              {alumni.program} · P{alumni.angkatan}
            </p>
          </div>

          {user?.role === "ADMIN" && (
            <div className="flex flex-wrap gap-3">
              <Button
                variant="secondary"
                disabled={accountUpdating}
                onClick={() => void toggleAccount()}
              >
                {accountUpdating
                  ? "Updating…"
                  : alumni.accountActive === false
                    ? "Enable account"
                    : "Disable account"}
              </Button>
              {/* Enabled even when publish fields are missing: the backend
                  validates the approval and returns the missing fields. */}
              <Button
                disabled={reviewing}
                onClick={() => void review("APPROVE")}
              >
                {reviewing ? "Reviewing…" : "Approve & publish"}
              </Button>
              <Button
                variant="secondary"
                disabled={reviewing}
                onClick={() => setRejectOpen(true)}
              >
                Reject
              </Button>
              <Button
                variant="secondary"
                onClick={() => setEditing((value) => !value)}
              >
                {editing ? "Cancel" : "Edit profile"}
              </Button>
            </div>
          )}
        </header>

        {editing ? (
          <Card className="p-6">
            <form onSubmit={save} className="space-y-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Full name">
                  <input
                    required
                    minLength={2}
                    className={inputClass}
                    value={form.fullName}
                    onChange={(event) => update("fullName", event.target.value)}
                  />
                </Field>

                <Field label="Program">
                  <input
                    required
                    className={inputClass}
                    value={form.program}
                    onChange={(event) => update("program", event.target.value)}
                  />
                </Field>

                <Field label="P (Angkatan)">
                  <input
                    required
                    type="number"
                    min="1"
                    max="99"
                    className={inputClass}
                    value={form.angkatan}
                    onChange={(event) => update("angkatan", event.target.value)}
                  />
                </Field>

                <Field label="Status">
                  <select
                    className={inputClass}
                    value={form.currentStatus}
                    onChange={(event) =>
                      update(
                        "currentStatus",
                        event.target.value as AlumniStatus,
                      )
                    }
                  >
                    {statuses.map((status) => (
                      <option key={status} value={status}>
                        {label(status)}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Phone">
                  <input
                    className={inputClass}
                    value={form.phone}
                    onChange={(event) => update("phone", event.target.value)}
                  />
                </Field>

                <Field label="Location">
                  <input
                    className={inputClass}
                    value={form.location}
                    onChange={(event) => update("location", event.target.value)}
                  />
                </Field>

                <Field label="Company">
                  <input
                    className={inputClass}
                    value={form.currentCompany}
                    onChange={(event) =>
                      update("currentCompany", event.target.value)
                    }
                  />
                </Field>

                <Field label="Position">
                  <input
                    className={inputClass}
                    value={form.currentPosition}
                    onChange={(event) =>
                      update("currentPosition", event.target.value)
                    }
                  />
                </Field>
              </div>

              <Field label="LinkedIn URL">
                <input
                  type="url"
                  className={inputClass}
                  value={form.linkedin}
                  onChange={(event) => update("linkedin", event.target.value)}
                />
              </Field>

              <Field label="Bio">
                <textarea
                  className={`${inputClass} min-h-28`}
                  value={form.bio}
                  onChange={(event) => update("bio", event.target.value)}
                />
              </Field>

              <label className="flex items-center gap-3 text-sm font-semibold">
                <input
                  type="checkbox"
                  checked={form.isPublic}
                  onChange={(event) => update("isPublic", event.target.checked)}
                />
                Public profile
              </label>

              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : "Save changes"}
              </Button>
            </form>
          </Card>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <Card className="space-y-6 p-6">
              {alumni.photo && (
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-[var(--rams-gray)]">
                    Profile photo
                  </p>
                  <a
                    href={alumni.photo}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-block text-sm font-bold text-[var(--rams-red)]"
                  >
                    View uploaded photo ↗
                  </a>
                </div>
              )}
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-[var(--rams-gray)]">
                  Current role
                </p>

                <p className="mt-2 text-lg font-semibold">
                  {alumni.currentPosition ?? "Not provided"}
                </p>

                <p className="mt-1 text-sm text-[var(--rams-gray)]">
                  {alumni.currentCompany ?? "Company not provided"}
                </p>
              </div>

              <div className="grid gap-5 border-t border-black/8 pt-6 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-[var(--rams-gray)]">
                    Location
                  </p>

                  <p className="mt-2 text-sm">
                    {alumni.location ?? "Not provided"}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-[var(--rams-gray)]">
                    Contact
                  </p>

                  <p className="mt-2 text-sm">
                    {alumni.phone ?? "Not provided"}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-[var(--rams-gray)]">
                    Profile visibility
                  </p>

                  <p className="mt-2 text-sm">
                    {alumni.isPublic ? "Public" : "Private"}
                  </p>
                </div>
              </div>

              {alumni.bio && (
                <div className="border-t border-black/8 pt-6">
                  <p className="text-xs font-bold uppercase tracking-wide text-[var(--rams-gray)]">
                    Bio
                  </p>

                  <p className="mt-2 whitespace-pre-wrap text-sm leading-7">
                    {alumni.bio}
                  </p>
                </div>
              )}

              {alumni.linkedin && (
                <a
                  href={alumni.linkedin}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-block text-sm font-bold text-[var(--rams-red)]"
                >
                  LinkedIn profile ↗
                </a>
              )}

              <History title="Career history">
                {alumni.careerHistory.map((item, index) => (
                  <li
                    key={`${item.company}-${item.startDate}-${index}`}
                    className="border-l-2 border-[var(--rams-red)] pl-4"
                  >
                    <p className="font-semibold">
                      {item.position} · {item.company}
                    </p>

                    <p className="mt-1 text-xs text-[var(--rams-gray)]">
                      {dateLabel(item.startDate)}
                      {item.endDate
                        ? ` – ${dateLabel(item.endDate)}`
                        : " – Present"}
                      {item.location ? ` · ${item.location}` : ""}
                    </p>
                  </li>
                ))}
              </History>

              <History title="Education history">
                {alumni.educationHistory.map((item, index) => (
                  <li
                    key={`${item.institution}-${item.startYear}-${index}`}
                    className="border-l-2 border-black/20 pl-4"
                  >
                    <p className="font-semibold">
                      {item.degree} · {item.institution}
                    </p>

                    <p className="mt-1 text-xs text-[var(--rams-gray)]">
                      {item.fieldOfStudy} · {item.startYear}
                      {item.endYear ? ` – ${item.endYear}` : " – Present"}
                    </p>
                  </li>
                ))}
              </History>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-[var(--rams-gray)]">
                    Journey
                  </p>

                  <h2 className="mt-1 text-xl font-bold">Tracking events</h2>
                </div>

                {user?.role === "ADMIN" && (
                  <Link
                    href={`/dashboard/tracking/${id}`}
                    className="text-sm font-bold text-[var(--rams-red)]"
                  >
                    Manage
                  </Link>
                )}
              </div>

              {tracking.length ? (
                <div className="mt-6 space-y-5 border-l border-black/10 pl-5">
                  {tracking.map((event) => (
                    <div key={event._id} className="relative">
                      <span className="absolute -left-[25px] top-1.5 h-2.5 w-2.5 rounded-full bg-[var(--rams-red)]" />

                      <p className="text-xs font-bold uppercase tracking-wide text-[var(--rams-red)]">
                        {label(event.type)}
                      </p>

                      <h3 className="mt-1 font-semibold">{event.title}</h3>

                      <p className="mt-1 text-xs text-[var(--rams-gray)]">
                        {dateLabel(event.startDate)}
                        {event.endDate ? ` – ${dateLabel(event.endDate)}` : ""}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-6 text-sm leading-6 text-[var(--rams-gray)]">
                  No tracking events have been recorded.
                </p>
              )}
            </Card>
          </div>
        )}

        {rejectOpen && (
          <RejectAlumniModal
            submitting={reviewing}
            onCancel={() => setRejectOpen(false)}
            onConfirm={(reason) => void review("REJECT", reason)}
          />
        )}
      </div>
    </div>
  );
}

function History({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const hasEntries = Array.isArray(children)
    ? children.length > 0
    : Boolean(children);

  return (
    <section className="border-t border-black/8 pt-6">
      <h2 className="text-sm font-bold uppercase tracking-wide text-[var(--rams-gray)]">
        {title}
      </h2>

      {hasEntries ? (
        <ul className="mt-4 space-y-4">{children}</ul>
      ) : (
        <p className="mt-3 text-sm text-[var(--rams-gray)]">
          No records provided.
        </p>
      )}
    </section>
  );
}
