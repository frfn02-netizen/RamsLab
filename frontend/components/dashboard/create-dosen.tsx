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
    specialization: "",
    phone: "",
    bio: "",
    linkedin: "",
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
        specialization: form.specialization
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        email: form.email,
        phone: form.phone || undefined,
        bio: form.bio || undefined,
        linkedin: form.linkedin || undefined,
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

              <div className="grid gap-5 sm:col-span-2 sm:grid-cols-2 sm:items-start">
                <div className="space-y-5">
                  <Field label="Phone">
                    <input
                      className={inputClass}
                      value={form.phone}
                      onChange={(event) => update("phone", event.target.value)}
                    />
                  </Field>

                  <Field label="LinkedIn URL (optional)">
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

            <Field label="Bio (optional)">
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
