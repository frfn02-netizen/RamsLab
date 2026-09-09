"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import DosenPhotoField from "@/components/dashboard/dosen-photo-field";
import {
  Button,
  Card,
  ErrorState,
  Field,
  PageHeader,
  inputClass,
} from "@/components/ui";
import { getUserFacingError } from "@/lib/api/errors";
import { createExpert, uploadExpertPhoto } from "@/lib/api/modules";

export default function CreateExpert() {
  const router = useRouter();

  const [form, setForm] = useState({
    name: "",
    employeeId: "",
    nip: "",
    nidn: "",
    title: "",
    position: "",
    phone: "",
    specialization: "",
    faculty: "",
    department: "",
    institution: "",
    program: "",
    linkedin: "",
    bio: "",
    showNip: false,
    showNidn: false,
    isPublic: true,
    published: false,
    order: "",
  });

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const update = (key: string, value: string | boolean) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  };

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const expert = await createExpert({
        name: form.name,
        employeeId: form.employeeId || undefined,
        nip: form.nip || undefined,
        nidn: form.nidn || undefined,
        title: form.title || undefined,
        position: form.position || undefined,
        phone: form.phone || undefined,
        specialization: form.specialization
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        faculty: form.faculty || undefined,
        department: form.department || undefined,
        institution: form.institution || undefined,
        program: form.program || undefined,
        linkedin: form.linkedin || undefined,
        bio: form.bio || undefined,
        showNip: form.showNip,
        showNidn: form.showNidn,
        isPublic: form.isPublic,
        published: form.published,
        order: form.order ? Number(form.order) : 0,
      });

      if (photoFile) {
        await uploadExpertPhoto(expert._id, photoFile);
      }

      router.push(`/dashboard/experts/${expert._id}`);
    } catch (reason) {
      setError(getUserFacingError(reason));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-5 sm:p-7 lg:p-9">
      <div className="mx-auto max-w-3xl space-y-7">
        <Link
          href="/dashboard/experts"
          className="text-sm font-bold text-[var(--rams-red)]"
        >
          ← Experts
        </Link>

        <PageHeader
          eyebrow="People"
          title="Add expert"
          description="Create an expert profile. Experts are standalone profiles, not user accounts."
        />

        {error && <ErrorState message={error} />}

        <Card className="p-6">
          <form onSubmit={submit} className="space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Full name">
                <input
                  required
                  minLength={2}
                  className={inputClass}
                  value={form.name}
                  onChange={(event) => update("name", event.target.value)}
                />
              </Field>

              <Field label="Employee ID">
                <input
                  className={inputClass}
                  value={form.employeeId}
                  onChange={(event) =>
                    update("employeeId", event.target.value)
                  }
                />
              </Field>

              <Field label="NIP">
                <input
                  className={inputClass}
                  value={form.nip}
                  onChange={(event) => update("nip", event.target.value)}
                />
              </Field>

              <Field label="NIDN">
                <input
                  className={inputClass}
                  value={form.nidn}
                  onChange={(event) => update("nidn", event.target.value)}
                />
              </Field>

              <Field label="Academic title">
                <input
                  className={inputClass}
                  placeholder="e.g. Dr. Ing."
                  value={form.title}
                  onChange={(event) => update("title", event.target.value)}
                />
              </Field>

              <Field label="Position">
                <input
                  className={inputClass}
                  value={form.position}
                  onChange={(event) => update("position", event.target.value)}
                />
              </Field>

              <Field label="Phone">
                <input
                  className={inputClass}
                  value={form.phone}
                  onChange={(event) => update("phone", event.target.value)}
                />
              </Field>

              <Field label="LinkedIn URL">
                <input
                  type="url"
                  className={inputClass}
                  value={form.linkedin}
                  onChange={(event) =>
                    update("linkedin", event.target.value)
                  }
                />
              </Field>

              <div className="sm:col-span-2">
                <Field label="Profile photo">
                  <DosenPhotoField
                    onFileChange={setPhotoFile}
                    disabled={saving}
                  />
                </Field>
              </div>
            </div>

            <Field label="Specializations">
              <input
                required
                className={inputClass}
                placeholder="Marine systems, Research"
                value={form.specialization}
                onChange={(event) =>
                  update("specialization", event.target.value)
                }
              />
              <p className="mt-1 text-xs text-[var(--rams-gray)]">
                Separate multiple entries with commas.
              </p>
            </Field>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Faculty">
                <input
                  className={inputClass}
                  value={form.faculty}
                  onChange={(event) => update("faculty", event.target.value)}
                />
              </Field>
              <Field label="Department">
                <input
                  className={inputClass}
                  value={form.department}
                  onChange={(event) =>
                    update("department", event.target.value)
                  }
                />
              </Field>
              <Field label="Institution">
                <input
                  className={inputClass}
                  value={form.institution}
                  onChange={(event) =>
                    update("institution", event.target.value)
                  }
                />
              </Field>
              <Field label="Program">
                <input
                  className={inputClass}
                  value={form.program}
                  onChange={(event) => update("program", event.target.value)}
                />
              </Field>
            </div>

            <Field label="Bio">
              <textarea
                className={`${inputClass} min-h-28`}
                value={form.bio}
                onChange={(event) => update("bio", event.target.value)}
              />
            </Field>

            <div className="space-y-3 border-t border-black/10 pt-5">
              <p className="text-sm font-bold">Visibility</p>
              <label className="flex items-center gap-3 text-sm font-semibold">
                <input
                  type="checkbox"
                  checked={form.showNip}
                  onChange={(event) => update("showNip", event.target.checked)}
                />
                Show NIP publicly
              </label>
              <label className="flex items-center gap-3 text-sm font-semibold">
                <input
                  type="checkbox"
                  checked={form.showNidn}
                  onChange={(event) => update("showNidn", event.target.checked)}
                />
                Show NIDN publicly
              </label>
              <label className="flex items-center gap-3 text-sm font-semibold">
                <input
                  type="checkbox"
                  checked={form.isPublic}
                  onChange={(event) =>
                    update("isPublic", event.target.checked)
                  }
                />
                Show profile publicly
              </label>
              <label className="flex items-center gap-3 text-sm font-semibold">
                <input
                  type="checkbox"
                  checked={form.published}
                  onChange={(event) =>
                    update("published", event.target.checked)
                  }
                />
                Published
              </label>
            </div>

            <Field label="Display Order (lower number = first)">
              <input
                type="number"
                min={0}
                className={inputClass}
                placeholder="0"
                value={form.order}
                onChange={(event) => update("order", event.target.value)}
              />
            </Field>

            <Button type="submit" disabled={saving}>
              {saving ? "Creating…" : "Create expert"}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
