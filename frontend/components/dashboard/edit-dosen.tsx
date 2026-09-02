"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import DosenPhotoField from "@/components/dashboard/dosen-photo-field";
import {
  Button,
  Card,
  ErrorState,
  Field,
  LoadingState,
  PageHeader,
  inputClass,
} from "@/components/ui";
import { getUserFacingError } from "@/lib/api/errors";
import { getDosenById, updateDosen, uploadDosenPhoto } from "@/lib/api/modules";
import type { Dosen, DosenEducation } from "@/types/modules";

type FormState = {
  fullName: string;
  employeeId: string;
  nip: string;
  nidn: string;
  title: string;
  position: string;
  email: string;
  phone: string;
  photo?: string;
  specialization: string;
  faculty: string;
  department: string;
  institution: string;
  program: string;
  linkedin: string;
  bio: string;
  education: DosenEducation[];
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
  showEmail: boolean;
  isPublic: boolean;
};

function fromDosen(d: Dosen): FormState {
  return {
    fullName: d.fullName,
    employeeId: d.employeeId ?? "",
    nip: d.nip ?? "",
    nidn: d.nidn ?? "",
    title: d.title ?? "",
    position: d.position ?? "",
    email: d.email ?? "",
    phone: d.phone ?? "",
    photo: d.photo,
    specialization: d.specialization.join(", "),
    faculty: d.faculty ?? "",
    department: d.department ?? "",
    institution: d.institution ?? "",
    program: d.program ?? "",
    linkedin: d.linkedin ?? "",
    bio: d.bio ?? "",
    education: d.education ?? [],
    sintaUrl: d.sintaUrl ?? "",
    googleScholarUrl: d.googleScholarUrl ?? "",
    scopusUrl: d.scopusUrl ?? "",
    orcidUrl: d.orcidUrl ?? "",
    hIndex: d.hIndex?.toString() ?? "",
    publicationCount: d.publicationCount?.toString() ?? "",
    projectCount: d.projectCount?.toString() ?? "",
    awardCount: d.awardCount?.toString() ?? "",
    showNip: d.showNip,
    showNidn: d.showNidn,
    showEmail: d.showEmail,
    isPublic: d.isPublic,
  };
}

export default function EditDosen({ id }: { id: string }) {
  const router = useRouter();
  const [dosen, setDosen] = useState<Dosen | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    getDosenById(id)
      .then((d) => {
        if (!cancelled) {
          setDosen(d);
          setForm(fromDosen(d));
        }
      })
      .catch((e) => {
        if (!cancelled) setError(getUserFacingError(e));
      });
    return () => {
      cancelled = true;
    };
  }, [id]);
  const set = (key: string, value: string | boolean) =>
    setForm((f) => (f ? { ...f, [key]: value } : f));
  const setEducation = (
    index: number,
    key: keyof DosenEducation,
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
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!form || !dosen) return;
    setSaving(true);
    setError(null);
    try {
      const result = await updateDosen(id, {
        fullName: form.fullName,
        employeeId: form.employeeId || undefined,
        nip: form.nip || undefined,
        nidn: form.nidn || undefined,
        title: form.title || undefined,
        position: form.position || undefined,
        email: form.email || undefined,
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
        showEmail: form.showEmail,
        isPublic: form.isPublic,
      });
      if (photo) await uploadDosenPhoto(id, photo);
      router.push(`/dashboard/dosen/${result._id}`);
    } catch (e) {
      setError(getUserFacingError(e));
    } finally {
      setSaving(false);
    }
  }
  if (error && !dosen)
    return (
      <div className="p-7">
        <ErrorState message={error} />
        <Link
          href="/dashboard/dosen"
          className="mt-5 inline-block font-bold text-[var(--rams-red)]"
        >
          ← Back to Dosen
        </Link>
      </div>
    );
  if (!form)
    return (
      <div className="p-7">
        <LoadingState label="Loading dosen" />
      </div>
    );
  const textFields: [keyof FormState, string][] = [
    ["fullName", "Full name"],
    ["employeeId", "Employee ID"],
    ["nip", "NIP"],
    ["nidn", "NIDN"],
    ["title", "Academic title"],
    ["position", "Position"],
    ["email", "Email"],
    ["phone", "Phone"],
    ["faculty", "Faculty"],
    ["department", "Department"],
    ["institution", "Institution"],
    ["program", "Program"],
    ["linkedin", "LinkedIn URL"],
  ];
  return (
    <div className="p-5 sm:p-7 lg:p-9">
      <div className="mx-auto max-w-4xl space-y-7">
        <Link
          href={`/dashboard/dosen/${id}`}
          className="text-sm font-bold text-[var(--rams-red)]"
        >
          ← Back to detail
        </Link>
        <PageHeader
          eyebrow="People"
          title="Edit Dosen"
          description="Update the complete lecturer profile."
        />
        {error && <ErrorState message={error} />}
        <Card className="p-6">
          <form onSubmit={submit} className="space-y-6">
            {dosen && (
              <Field label="Profile photo">
                <DosenPhotoField
                  initialUrl={dosen.photo}
                  onFileChange={setPhoto}
                  disabled={saving}
                />
              </Field>
            )}
            <div className="grid gap-5 sm:grid-cols-2">
              {textFields.map(([key, label]) => (
                <Field key={key} label={label}>
                  <input
                    required={key === "fullName" || key === "email"}
                    type={
                      key === "email"
                        ? "email"
                        : key === "linkedin"
                          ? "url"
                          : "text"
                    }
                    className={inputClass}
                    value={String(form[key] ?? "")}
                    onChange={(e) => set(key, e.target.value)}
                  />
                </Field>
              ))}
            </div>
            <Field label="Specializations">
              <input
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
                  {(["degree", "field", "institution"] as const).map((key) => (
                    <Field
                      key={key}
                      label={key === "field" ? "Field of study" : key}
                    >
                      <input
                        required
                        className={inputClass}
                        value={e[key]}
                        onChange={(v) => setEducation(i, key, v.target.value)}
                      />
                    </Field>
                  ))}
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
                              education: f.education.filter((_, n) => n !== i),
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
              {[
                ["showNip", "Show NIP publicly"],
                ["showNidn", "Show NIDN publicly"],
                ["showEmail", "Show email publicly"],
                ["isPublic", "Public profile"],
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
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
