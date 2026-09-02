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
import {
  createDosen,
  createDosenAccount,
  uploadDosenPhoto,
} from "@/lib/api/modules";

export default function CreateDosen() {
  const router = useRouter();

  const [form, setForm] = useState({
    email: "",
    password: "",
    fullName: "",
    employeeId: "",
    nip: "",
    nidn: "",
    faculty: "",
    department: "",
    institution: "",
    program: "",
    specialization: "",
    phone: "",
    bio: "",
    linkedin: "",
    showNip: false,
    showNidn: false,
    showEmail: false,
    isPublic: true,
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
      const account = await createDosenAccount({
        email: form.email,
        password: form.password,
      });

      const dosen = await createDosen({
        userId: account.id,
        fullName: form.fullName,
        employeeId: form.employeeId || undefined,
        nip: form.nip || undefined,
        nidn: form.nidn || undefined,
        faculty: form.faculty || undefined,
        department: form.department || undefined,
        institution: form.institution || undefined,
        program: form.program || undefined,
        specialization: form.specialization
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        email: form.email,
        phone: form.phone || undefined,
        bio: form.bio || undefined,
        linkedin: form.linkedin || undefined,
        showNip: form.showNip,
        showNidn: form.showNidn,
        showEmail: form.showEmail,
        isPublic: form.isPublic,
      });

      if (photoFile) {
        await uploadDosenPhoto(dosen._id, photoFile);
      }

      router.push(`/dashboard/dosen/${dosen._id}`);
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
          href="/dashboard/dosen"
          className="text-sm font-bold text-[var(--rams-red)]"
        >
          ← Dosen
        </Link>

        <PageHeader
          eyebrow="People"
          title="Add dosen"
          description="Create the managed lecturer account and profile together."
        />

        {error && <ErrorState message={error} />}

        <Card className="p-6">
          <form onSubmit={submit} className="space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Email">
                <input
                  required
                  type="email"
                  autoComplete="email"
                  className={inputClass}
                  value={form.email}
                  onChange={(event) => update("email", event.target.value)}
                />
              </Field>

              <Field label="Temporary password">
                <input
                  required
                  minLength={8}
                  type="password"
                  autoComplete="new-password"
                  className={inputClass}
                  value={form.password}
                  onChange={(event) => update("password", event.target.value)}
                />
              </Field>

              <Field label="Full name">
                <input
                  required
                  minLength={2}
                  className={inputClass}
                  value={form.fullName}
                  onChange={(event) => update("fullName", event.target.value)}
                />
              </Field>

              <Field label="Employee ID">
                <input
                  className={inputClass}
                  value={form.employeeId}
                  onChange={(event) => update("employeeId", event.target.value)}
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

              <div className="grid gap-5 sm:col-span-2 sm:grid-cols-2 sm:items-start">
                <div className="space-y-5">
                  <Field label="Phone">
                    <input
                      className={inputClass}
                      value={form.phone}
                      onChange={(event) => update("phone", event.target.value)}
                    />
                  </Field>

                  <Field label="LinkedIn URL (optional">
                    <input
                      type="url"
                      className={inputClass}
                      value={form.linkedin}
                      onChange={(event) =>
                        update("linkedin", event.target.value)
                      }
                    />
                  </Field>
                </div>

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
                  onChange={(event) => update("department", event.target.value)}
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

            <Field label="Bio (optional)">
              <textarea
                className={`${inputClass} min-h-28`}
                value={form.bio}
                onChange={(event) => update("bio", event.target.value)}
              />
            </Field>

            <div className="space-y-3 border-t border-black/10 pt-5">
              <p className="text-sm font-bold">Public academic information</p>
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
                  checked={form.showEmail}
                  onChange={(event) =>
                    update("showEmail", event.target.checked)
                  }
                />
                Show email publicly
              </label>
            </div>

            <label className="flex items-center gap-3 text-sm font-semibold">
              <input
                type="checkbox"
                checked={form.isPublic}
                onChange={(event) => update("isPublic", event.target.checked)}
              />
              Show profile publicly when a public route is available
            </label>

            <Button type="submit" disabled={saving}>
              {saving ? "Creating account…" : "Create dosen"}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
