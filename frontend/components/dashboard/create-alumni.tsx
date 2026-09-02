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

export default function CreateAlumni() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    password?: string;
  }>({});
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors: typeof fieldErrors = {};
    const normalizedEmail = email.trim();
    if (!normalizedEmail) {
      nextErrors.email = "Email is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      nextErrors.email =
        "Enter a valid email address, for example alumni@example.com.";
    }
    if (!password) {
      nextErrors.password = "Temporary password is required.";
    } else if (password.length < 8) {
      nextErrors.password = "Temporary password must be at least 8 characters.";
    } else if (password.length > 128) {
      nextErrors.password =
        "Temporary password must be 128 characters or fewer.";
    }
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    setSaving(true);
    setError(null);
    try {
      const result = await createAdminAlumni({
        email: normalizedEmail,
        password,
      });
      router.push(`/dashboard/alumni/${result.alumni._id}`);
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
          href="/dashboard/alumni"
          className="text-sm font-bold text-[var(--rams-red)]"
        >
          ← Alumni
        </Link>
        <PageHeader
          eyebrow="People"
          title="Create Alumni Account"
          description="Create the alumni account first. The alumni will complete their profile after signing in."
        />
        {error && <ErrorState message={error} />}
        <Card className="p-6">
          <form onSubmit={submit} className="max-w-xl space-y-5">
            <Field label="Email" error={fieldErrors.email}>
              <input
                required
                type="email"
                autoComplete="email"
                className={inputClass}
                value={email}
                aria-invalid={Boolean(fieldErrors.email)}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setFieldErrors((current) => ({
                    ...current,
                    email: undefined,
                  }));
                }}
              />
            </Field>
            <Field label="Temporary Password" error={fieldErrors.password}>
              <input
                required
                minLength={8}
                type="password"
                autoComplete="new-password"
                className={inputClass}
                value={password}
                aria-invalid={Boolean(fieldErrors.password)}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setFieldErrors((current) => ({
                    ...current,
                    password: undefined,
                  }));
                }}
              />
            </Field>
            <p className="text-xs leading-5 text-[var(--rams-gray)]">
              Use at least 8 characters. This password is temporary and must be
              changed by the alumni after the first login.
            </p>
            <Button type="submit" disabled={saving}>
              {saving ? "Creating…" : "Create Alumni Account"}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
