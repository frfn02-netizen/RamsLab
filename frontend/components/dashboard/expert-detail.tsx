"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { useAuth } from "@/components/providers/auth-providers";
import DosenPhotoField from "@/components/dashboard/dosen-photo-field";
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
  deleteExpert,
  getExpertById,
  updateExpert,
  uploadExpertPhoto,
} from "@/lib/api/modules";
import { getUserFacingError } from "@/lib/api/errors";
import type { Expert, ExpertEducation } from "@/types/modules";

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

type FormState = {
  name: string;
  employeeId: string;
  nip: string;
  nidn: string;
  title: string;
  position: string;
  phone: string;
  photo?: string;
  specialization: string;
  faculty: string;
  department: string;
  institution: string;
  program: string;
  linkedin: string;
  bio: string;
  education: ExpertEducation[];
  sintaUrl: string;
  googleScholarUrl: string;
  scopusUrl: string;
  orcidUrl: string;
  hIndex: string;
  publicationCount: string;
  projectCount: string;
  awardCount: string;
  showNip: boolean;
  showNidn: boolean;
  isPublic: boolean;
  published: boolean;
  order: string;
};

function fromExpert(e: Expert): FormState {
  return {
    name: e.name,
    employeeId: e.employeeId ?? "",
    nip: e.nip ?? "",
    nidn: e.nidn ?? "",
    title: e.title ?? "",
    position: e.position ?? "",
    phone: e.phone ?? "",
    photo: e.photo,
    specialization: e.specialization.join(", "),
    faculty: e.faculty ?? "",
    department: e.department ?? "",
    institution: e.institution ?? "",
    program: e.program ?? "",
    linkedin: e.linkedin ?? "",
    bio: e.bio ?? "",
    education: e.education ?? [],
    sintaUrl: e.sintaUrl ?? "",
    googleScholarUrl: e.googleScholarUrl ?? "",
    scopusUrl: e.scopusUrl ?? "",
    orcidUrl: e.orcidUrl ?? "",
    hIndex: e.hIndex?.toString() ?? "",
    publicationCount: e.publicationCount?.toString() ?? "",
    projectCount: e.projectCount?.toString() ?? "",
    awardCount: e.awardCount?.toString() ?? "",
    showNip: e.showNip,
    showNidn: e.showNidn,
    isPublic: e.isPublic,
    published: e.published,
    order: e.order?.toString() ?? "0",
  };
}

export default function ExpertDetail({ id }: { id: string }) {
  const { user } = useAuth();
  const router = useRouter();
  const [expert, setExpert] = useState<Expert | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<FormState | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getExpertById(id)
      .then((result) => {
        if (!cancelled) {
          setExpert(result);
          setForm(fromExpert(result));
        }
      })
      .catch((reason) => {
        if (!cancelled) setError(getUserFacingError(reason));
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const set = (key: string, value: string | boolean) =>
    setForm((f) => (f ? { ...f, [key]: value } : f));

  const setEducation = (
    index: number,
    key: keyof ExpertEducation,
    value: string,
  ) =>
    setForm((f) =>
      f
        ? {
            ...f,
            education: f.education.map((e, i) =>
              i === index
                ? {
                    ...e,
                    [key]: key.includes("Year")
                      ? value
                        ? Number(value)
                        : undefined
                      : value,
                  }
                : e,
            ),
          }
        : f,
    );

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!form || !expert) return;
    setSaving(true);
    setError(null);
    try {
      const result = await updateExpert(id, {
        name: form.name,
        employeeId: form.employeeId || undefined,
        nip: form.nip || undefined,
        nidn: form.nidn || undefined,
        title: form.title || undefined,
        position: form.position || undefined,
        phone: form.phone || undefined,
        specialization: form.specialization
          .split(",")
          .map((x) => x.trim())
          .filter(Boolean),
        faculty: form.faculty || undefined,
        department: form.department || undefined,
        institution: form.institution || undefined,
        program: form.program || undefined,
        linkedin: form.linkedin || undefined,
        bio: form.bio || undefined,
        education: form.education,
        sintaUrl: form.sintaUrl || undefined,
        googleScholarUrl: form.googleScholarUrl || undefined,
        scopusUrl: form.scopusUrl || undefined,
        orcidUrl: form.orcidUrl || undefined,
        hIndex: form.hIndex ? Number(form.hIndex) : undefined,
        publicationCount: form.publicationCount
          ? Number(form.publicationCount)
          : undefined,
        projectCount: form.projectCount ? Number(form.projectCount) : undefined,
        awardCount: form.awardCount ? Number(form.awardCount) : undefined,
        showNip: form.showNip,
        showNidn: form.showNidn,
        isPublic: form.isPublic,
        published: form.published,
        order: form.order ? Number(form.order) : 0,
      });
      if (photo) await uploadExpertPhoto(id, photo);
      setExpert(result);
      setEditing(false);
      setPhoto(null);
    } catch (reason) {
      setError(getUserFacingError(reason));
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (
      !expert ||
      !window.confirm(`Delete "${expert.name}"? This cannot be undone.`)
    ) {
      return;
    }
    setDeleting(true);
    setError(null);
    try {
      await deleteExpert(id);
      router.push("/dashboard/experts");
    } catch (reason) {
      setError(getUserFacingError(reason));
      setDeleting(false);
    }
  }

  if (!expert && !error)
    return (
      <div className="p-5 sm:p-7 lg:p-9">
        <LoadingState label="Loading expert" />
      </div>
    );
  if (error && !expert)
    return (
      <div className="p-5 sm:p-7 lg:p-9">
        <ErrorState message={error} />
        <Link
          href="/dashboard/experts"
          className="mt-5 inline-block font-bold text-[var(--rams-red)]"
        >
          ← Back to Experts
        </Link>
      </div>
    );
  if (!expert || !form) return null;

  if (editing) {
    const textFields: [keyof FormState, string, string?][] = [
      ["name", "Full name"],
      ["employeeId", "Employee ID"],
      ["nip", "NIP"],
      ["nidn", "NIDN"],
      ["title", "Academic title"],
      ["position", "Position"],
      ["phone", "Phone"],
      ["linkedin", "LinkedIn URL"],
      ["faculty", "Faculty"],
      ["department", "Department"],
      ["institution", "Institution"],
      ["program", "Program"],
    ];

    return (
      <div className="p-5 sm:p-7 lg:p-9">
        <div className="mx-auto max-w-4xl space-y-7">
          <Link
            href={`/dashboard/experts/${id}`}
            className="text-sm font-bold text-[var(--rams-red)]"
          >
            ← Back to detail
          </Link>
          <ErrorState message={error ?? ""} />
          <Card className="p-6">
            <form onSubmit={(e) => void save(e)} className="space-y-6">
              <Field label="Profile photo">
                <DosenPhotoField
                  initialUrl={expert.photo}
                  onFileChange={setPhoto}
                  disabled={saving}
                />
              </Field>
              <div className="grid gap-5 sm:grid-cols-2">
                {textFields.map(([key, label, type]) => (
                  <Field key={key} label={label}>
                    <input
                      required={key === "name"}
                      type={type ?? (key === "linkedin" ? "url" : "text")}
                      className={inputClass}
                      value={String(form[key] ?? "")}
                      onChange={(e) => set(key, e.target.value)}
                    />
                  </Field>
                ))}
              </div>
              <Field label="Specializations">
                <input
                  required
                  className={inputClass}
                  value={form.specialization}
                  onChange={(e) => set("specialization", e.target.value)}
                />
              </Field>
              <Field label="Bio">
                <textarea
                  className={`${inputClass} min-h-28`}
                  value={form.bio}
                  onChange={(e) => set("bio", e.target.value)}
                />
              </Field>
              <section className="space-y-4 border-t border-black/10 pt-5">
                <div className="flex justify-between">
                  <h2 className="font-bold">Education history</h2>
                  <button
                    type="button"
                    className="text-sm font-semibold text-[var(--rams-red)]"
                    onClick={() =>
                      setForm((f) =>
                        f
                          ? {
                              ...f,
                              education: [
                                ...f.education,
                                { degree: "", field: "", institution: "" },
                              ],
                            }
                          : f,
                      )
                    }
                  >
                    Add education
                  </button>
                </div>
                {form.education.map((e, i) => (
                  <div
                    key={i}
                    className="grid gap-3 rounded border border-black/10 p-4 sm:grid-cols-2"
                  >
                    {(["degree", "field", "institution"] as const).map(
                      (key) => (
                        <Field
                          key={key}
                          label={key === "field" ? "Field of study" : key}
                        >
                          <input
                            required
                            className={inputClass}
                            value={e[key]}
                            onChange={(v) =>
                              setEducation(i, key, v.target.value)
                            }
                          />
                        </Field>
                      ),
                    )}
                    {(["startYear", "endYear"] as const).map((key) => (
                      <Field
                        key={key}
                        label={key === "startYear" ? "Start year" : "End year"}
                      >
                        <input
                          type="number"
                          min="1900"
                          max="2100"
                          className={inputClass}
                          value={e[key] ?? ""}
                          onChange={(v) => setEducation(i, key, v.target.value)}
                        />
                      </Field>
                    ))}
                    <button
                      type="button"
                      className="text-left text-xs font-semibold text-red-700 sm:col-span-2"
                      onClick={() =>
                        setForm((f) =>
                          f
                            ? {
                                ...f,
                                education: f.education.filter(
                                  (_, n) => n !== i,
                                ),
                              }
                            : f,
                        )
                      }
                    >
                      Remove education
                    </button>
                  </div>
                ))}
              </section>
              <section className="grid gap-5 border-t border-black/10 pt-5 sm:grid-cols-2">
                {(
                  [
                    "sintaUrl",
                    "googleScholarUrl",
                    "scopusUrl",
                    "orcidUrl",
                  ] as const
                ).map((key) => (
                  <Field
                    key={key}
                    label={key.replace("Url", "").replace(/([A-Z])/g, " $1")}
                  >
                    <input
                      type="url"
                      className={inputClass}
                      value={form[key]}
                      onChange={(e) => set(key, e.target.value)}
                    />
                  </Field>
                ))}
                {(
                  [
                    "hIndex",
                    "publicationCount",
                    "projectCount",
                    "awardCount",
                  ] as const
                ).map((key) => (
                  <Field key={key} label={key}>
                    <input
                      type="number"
                      min="0"
                      className={inputClass}
                      value={form[key]}
                      onChange={(e) => set(key, e.target.value)}
                    />
                  </Field>
                ))}
              </section>
              <div className="space-y-3 border-t border-black/10 pt-5">
                <p className="text-sm font-bold">Visibility</p>
                {[
                  ["showNip", "Show NIP publicly"],
                  ["showNidn", "Show NIDN publicly"],
                  ["isPublic", "Show profile publicly"],
                  ["published", "Published"],
                ].map(([key, label]) => (
                  <label
                    key={key}
                    className="flex items-center gap-3 text-sm font-semibold"
                  >
                    <input
                      type="checkbox"
                      checked={Boolean(form[key as keyof FormState])}
                      onChange={(e) => set(key, e.target.checked)}
                    />
                    {label}
                  </label>
                ))}
              </div>
              <Field label="Display Order (lower number = first)">
                <input
                  type="number"
                  min={0}
                  className={inputClass}
                  value={form.order}
                  onChange={(e) => set("order", e.target.value)}
                />
              </Field>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : "Save changes"}
              </Button>
            </form>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="p-5 sm:p-7 lg:p-9">
      <div className="mx-auto max-w-5xl space-y-7">
        <Link
          href="/dashboard/experts"
          className="text-sm font-bold text-[var(--rams-red)]"
        >
          ← Back to Experts
        </Link>
        {error && <ErrorState message={error} />}
        <Card className="p-6 sm:p-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 flex-col gap-5 sm:flex-row">
              <div className="relative h-32 w-32 shrink-0 overflow-hidden bg-[var(--rams-charcoal)]">
                {expert.photo ? (
                  <>
                    <span className="sr-only">Profile photo</span>
                    <Image
                      src={expert.photo}
                      alt={expert.name}
                      fill
                      className="object-cover"
                      sizes="128px"
                    />
                  </>
                ) : (
                  <div className="grid h-full place-items-center text-4xl font-semibold text-white/85">
                    {initials(expert.name)}
                  </div>
                )}
              </div>
              <div>
                <div className="flex flex-wrap gap-3">
                  <Badge tone={expert.isPublic ? "green" : "neutral"}>
                    {expert.isPublic ? "Public" : "Private"}
                  </Badge>
                  <Badge tone={expert.published ? "green" : "neutral"}>
                    {expert.published ? "Published" : "Draft"}
                  </Badge>
                </div>
                <h1 className="mt-4 font-display text-4xl font-semibold tracking-[-0.04em] text-[var(--rams-charcoal)]">
                  {expert.name}
                </h1>
                {(expert.title || expert.position) && (
                  <p className="mt-2 text-lg text-[var(--rams-gray)]">
                    {[expert.title, expert.position]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                )}
                {(expert.faculty || expert.department) && (
                  <p className="mt-2 text-sm text-[var(--rams-gray)]">
                    {[expert.faculty, expert.department]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                )}
              </div>
            </div>
            {user?.role === "ADMIN" && (
              <div className="flex shrink-0 gap-2">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setEditing(true);
                    setForm(fromExpert(expert));
                    setPhoto(null);
                  }}
                >
                  Edit
                </Button>
                <Button
                  variant="danger"
                  disabled={deleting}
                  onClick={() => void remove()}
                >
                  {deleting ? "Deleting…" : "Delete"}
                </Button>
              </div>
            )}
          </div>
        </Card>

        {(expert.employeeId || expert.nip || expert.nidn) && (
          <Section title="Identity">
            <div className="grid gap-6 sm:grid-cols-3">
              {[
                ["Employee ID", expert.employeeId],
                ["NIP", expert.showNip ? expert.nip : null],
                ["NIDN", expert.showNidn ? expert.nidn : null],
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
        {(expert.phone || expert.linkedin) && (
          <Section title="Contact">
            <div className="grid gap-6 sm:grid-cols-3">
              {expert.phone && (
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-[var(--rams-gray)]">
                    Phone
                  </p>
                  <p className="mt-2">{expert.phone}</p>
                </div>
              )}
              {expert.linkedin && (
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-[var(--rams-gray)]">
                    LinkedIn
                  </p>
                  <a
                    href={expert.linkedin}
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
        {(expert.faculty ||
          expert.department ||
          expert.institution ||
          expert.program) && (
          <Section title="Academic Information">
            <div className="grid gap-6 sm:grid-cols-2">
              {[
                ["Faculty", expert.faculty],
                ["Department", expert.department],
                ["Institution", expert.institution],
                ["Program", expert.program],
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
        {expert.specialization.length > 0 && (
          <Section title="Specializations">
            <div className="flex flex-wrap gap-2">
              {expert.specialization.map((value) => (
                <Badge key={value}>{value}</Badge>
              ))}
            </div>
          </Section>
        )}
        {expert.bio && (
          <Section title="Biography">
            <p className="whitespace-pre-wrap leading-7">{expert.bio}</p>
          </Section>
        )}
        {expert.education && expert.education.length > 0 && (
          <Section title="Education">
            <div className="space-y-5">
              {expert.education.map((item, index) => (
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
        {(expert.sintaUrl ||
          expert.googleScholarUrl ||
          expert.scopusUrl ||
          expert.orcidUrl) && (
          <Section title="Academic Profiles">
            <div className="flex flex-wrap gap-4">
              {[
                ["SINTA", expert.sintaUrl],
                ["Google Scholar", expert.googleScholarUrl],
                ["Scopus", expert.scopusUrl],
                ["ORCID", expert.orcidUrl],
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
        {(expert.hIndex !== undefined ||
          expert.publicationCount !== undefined ||
          expert.projectCount !== undefined ||
          expert.awardCount !== undefined) && (
          <Section title="Statistics">
            <div className="grid gap-6 sm:grid-cols-4">
              {[
                ["h-index", expert.hIndex],
                ["Publications", expert.publicationCount],
                ["Projects", expert.projectCount],
                ["Awards", expert.awardCount],
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
              ["Show NIP", expert.showNip],
              ["Show NIDN", expert.showNidn],
              ["Public profile", expert.isPublic],
              ["Published", expert.published],
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
