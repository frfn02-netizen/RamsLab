"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import {
  Button,
  Card,
  ErrorState,
  Field,
  PageHeader,
  inputClass,
} from "@/components/ui";
import { createAdminAlumni } from "@/lib/api/alumni";
import { getUserFacingError } from "@/lib/api/errors";
import type { AlumniStatus } from "@/types/alumni";

export default function CreateAlumni() {
  const router = useRouter();

  const [form, setForm] = useState({
    email: "",
    password: "",
    fullName: "",
    nim: "",
    graduationYear: String(new Date().getFullYear()),
    program: "Not specified",
    currentStatus: "WORKING" as AlumniStatus,
    phone: "",
    location: "",
    currentCompany: "",
    currentPosition: "",
    linkedin: "",
    isPublic: false,
  });

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const result = await createAdminAlumni({
        ...form,
        graduationYear: Number(form.graduationYear),
        phone: form.phone || undefined,
        location: form.location || undefined,
        currentCompany: form.currentCompany || undefined,
        currentPosition: form.currentPosition || undefined,
        linkedin: form.linkedin || undefined,
      });

      router.push(`/dashboard/alumni/${result.alumni._id}`);
    } catch (reason) {
      setError(getUserFacingError(reason));
    } finally {
      setSaving(false);
    }
  }

  const update = (key: string, value: string | boolean) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  };

  return (
    <div className="p-5 sm:p-7 lg:p-9">
      <div className="mx-auto max-w-3xl space-y-7">
        <Link
          href="/dashboard/alumni"
          className="text-sm font-bold text-[var(--rams-red)]"
        >
          ← Alumni
        </Link>

        <PageHeader
          eyebrow="People"
          title="Add alumni"
          description="Create an alumni account and profile in one step."
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
                  value={form.fullName}
                  onChange={(event) => update("fullName", event.target.value)}
                />
              </Field>

              <Field label="NIM">
                <input
                  required
                  className={inputClass}
                  value={form.nim}
                  onChange={(event) => update("nim", event.target.value)}
                />
              </Field>

              <Field label="Entry year">
                <input
                  required
                  type="number"
                  min="1900"
                  max="2100"
                  className={inputClass}
                  value={form.graduationYear}
                  onChange={(event) =>
                    update("graduationYear", event.target.value)
                  }
                />
              </Field>

              <Field label="Company / Institution">
                <input
                  required
                  className={inputClass}
                  value={form.currentCompany}
                  onChange={(event) =>
                    update("currentCompany", event.target.value)
                  }
                />
              </Field>

              <Field label="Position">
                <input
                  required
                  className={inputClass}
                  value={form.currentPosition}
                  onChange={(event) =>
                    update("currentPosition", event.target.value)
                  }
                />
              </Field>

              <Field label="Domicile / Location">
                <input
                  required
                  className={inputClass}
                  value={form.location}
                  onChange={(event) => update("location", event.target.value)}
                />
              </Field>

              <Field label="LinkedIn URL">
                <input
                  type="url"
                  className={inputClass}
                  value={form.linkedin}
                  onChange={(event) => update("linkedin", event.target.value)}
                />
              </Field>

              <Field label="Email">
                <input
                  required
                  type="email"
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
                  className={inputClass}
                  value={form.password}
                  onChange={(event) => update("password", event.target.value)}
                />
              </Field>
            </div>

            <label className="flex items-center gap-3 text-sm font-semibold">
              <input
                type="checkbox"
                checked={form.isPublic}
                onChange={(event) => update("isPublic", event.target.checked)}
              />
              Make profile public
            </label>

            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Create alumni profile"}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
