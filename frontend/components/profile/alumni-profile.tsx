"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/auth-providers";
import {
  Badge,
  Button,
  Card,
  ErrorState,
  Field,
  LoadingState,
  PageHeader,
  inputClass,
} from "@/components/ui";
import { getMyAlumni, updateMyAlumni } from "@/lib/api/alumni";
import { getUserFacingError } from "@/lib/api/errors";
import type { Alumni, AlumniStatus } from "@/types/alumni";

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

export default function AlumniProfile() {
  const { logout, status, user } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<Alumni | null>(null);
  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    location: "",
    currentStatus: "WORKING" as AlumniStatus,
    currentCompany: "",
    currentPosition: "",
    linkedin: "",
    bio: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login?next=/profile");
    else if (status === "authenticated" && user?.role !== "ALUMNI")
      router.replace("/dashboard");
  }, [router, status, user]);
  useEffect(() => {
    if (status !== "authenticated" || user?.role !== "ALUMNI") return;
    let cancelled = false;
    getMyAlumni()
      .then((result) => {
        if (!cancelled) {
          setProfile(result);
          setForm({
            fullName: result.fullName,
            phone: result.phone ?? "",
            location: result.location ?? "",
            currentStatus: result.currentStatus,
            currentCompany: result.currentCompany ?? "",
            currentPosition: result.currentPosition ?? "",
            linkedin: result.linkedin ?? "",
            bio: result.bio ?? "",
          });
        }
      })
      .catch((reason) => {
        if (!cancelled) setError(getUserFacingError(reason));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [status, user]);
  const update = (key: string, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const result = await updateMyAlumni({
        fullName: form.fullName,
        phone: form.phone || undefined,
        location: form.location || undefined,
        currentStatus: form.currentStatus,
        currentCompany: form.currentCompany || undefined,
        currentPosition: form.currentPosition || undefined,
        linkedin: form.linkedin || undefined,
        bio: form.bio || undefined,
      });
      setProfile(result);
    } catch (reason) {
      setError(getUserFacingError(reason));
    } finally {
      setSaving(false);
    }
  }
  if (status === "loading" || loading || !user || user.role !== "ALUMNI")
    return (
      <div className="p-5 sm:p-7 lg:p-9">
        <LoadingState label="Checking your session" />
      </div>
    );
  if (!profile)
    return (
      <div className="p-5 sm:p-7 lg:p-9">
        <ErrorState
          message={error ?? "Your alumni profile could not be found."}
        />
      </div>
    );
  return (
    <div className="min-h-screen bg-[var(--rams-gray-light)] p-5 sm:p-8">
      <div className="mx-auto max-w-3xl space-y-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/" className="text-sm font-bold text-[var(--rams-red)]">
            RAMS Platform
          </Link>
          <Button variant="secondary" onClick={() => void logout()}>
            Sign out
          </Button>
        </div>
        <PageHeader
          eyebrow="Alumni profile"
          title="Your profile"
          description="Keep the professional information you choose to share with RAMS up to date."
        />
        {error && <ErrorState message={error} />}
        <Card className="p-6">
          <div className="mb-6 flex flex-wrap items-center gap-3">
            <Badge
              tone={
                profile.currentStatus === "SEEKING_JOB" ? "amber" : "neutral"
              }
            >
              {label(profile.currentStatus)}
            </Badge>
            <span className="text-sm text-[var(--rams-gray)]">
              {profile.program} · Class of {profile.graduationYear}
            </span>
          </div>
          <form onSubmit={save} className="space-y-5">
            <Field label="Full name">
              <input
                required
                minLength={2}
                className={inputClass}
                value={form.fullName}
                onChange={(event) => update("fullName", event.target.value)}
              />
            </Field>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Status">
                <select
                  className={inputClass}
                  value={form.currentStatus}
                  onChange={(event) =>
                    update("currentStatus", event.target.value)
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
              <Field label="LinkedIn URL">
                <input
                  type="url"
                  className={inputClass}
                  value={form.linkedin}
                  onChange={(event) => update("linkedin", event.target.value)}
                />
              </Field>
            </div>
            <Field label="Bio">
              <textarea
                className={`${inputClass} min-h-32`}
                value={form.bio}
                onChange={(event) => update("bio", event.target.value)}
              />
            </Field>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save profile"}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
