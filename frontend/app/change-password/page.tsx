"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import {
  Button,
  Card,
  ErrorState,
  Field,
  PageHeader,
  inputClass,
} from "@/components/ui";
import { useAuth } from "@/components/providers/auth-providers";
import { changePassword } from "@/lib/api/auth";
import { getUserFacingError } from "@/lib/api/errors";

export default function ChangePasswordPage() {
  const { user, refresh } = useAuth();
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const submittingRef = useRef(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSaving(true);
    setError(null);
    try {
      await changePassword({ currentPassword, newPassword });
      await refresh();
      router.replace(
        user?.role === "ALUMNI" ? "/dashboard/alumni/profile" : "/dashboard",
      );
    } catch (reason) {
      setError(getUserFacingError(reason));
    } finally {
      setSaving(false);
      submittingRef.current = false;
    }
  }
  return (
    <main className="min-h-screen bg-[var(--rams-gray-light)] p-5 sm:p-8">
      <div className="mx-auto max-w-xl space-y-7">
        <PageHeader
          eyebrow="Account security"
          title="Change your password"
          description="Your temporary password can only be used for your first sign-in. Choose a new password to continue."
        />
        {error && <ErrorState message={error} />}
        <Card className="p-6">
          <form onSubmit={submit} className="space-y-5">
            <Field label="Current password">
              <input
                required
                type="password"
                autoComplete="current-password"
                className={inputClass}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </Field>
            <Field label="New password">
              <input
                required
                minLength={8}
                type="password"
                autoComplete="new-password"
                className={inputClass}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </Field>
            <Button type="submit" disabled={saving}>
              {saving ? "Updating…" : "Change password"}
            </Button>
          </form>
        </Card>
      </div>
    </main>
  );
}
