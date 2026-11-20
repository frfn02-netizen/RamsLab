"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import DosenPhotoField from "@/components/dashboard/dosen-photo-field";
import { useToast } from "@/components/providers/toast-providers";
import { Button, Card, Field, LinkButton, PageHeader, inputClass } from "@/components/ui";
import { getUserFacingError } from "@/lib/api/errors";
import {
  createDosen,
  createDosenAccount,
  resetUserPassword,
  uploadDosenPhoto,
} from "@/lib/api/modules";

export default function CreateDosen() {
  const { error: notifyError } = useToast();

  const [form, setForm] = useState({
    email: "",
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
  const [saving, setSaving] = useState(false);
  const [pendingAccount, setPendingAccount] = useState<{
    id: string;
    email: string;
    temporaryPassword?: string;
  } | null>(null);
  const [createdDosenId, setCreatedDosenId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showTemporaryPassword, setShowTemporaryPassword] = useState(true);
  const [temporaryPasswordCleared, setTemporaryPasswordCleared] =
    useState(false);
  const [regeneratingPassword, setRegeneratingPassword] = useState(false);

  const update = (key: string, value: string | boolean) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  };

  async function copyTemporaryPassword() {
    if (!pendingAccount?.temporaryPassword || temporaryPasswordCleared) return;
    try {
      await navigator.clipboard.writeText(pendingAccount.temporaryPassword);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      notifyError("Could not copy the password. Select it manually.");
    }
  }

  async function regenerateTemporaryPassword() {
    if (!pendingAccount) return;
    setRegeneratingPassword(true);
    try {
      const result = await resetUserPassword(pendingAccount.id);
      setPendingAccount({
        ...pendingAccount,
        temporaryPassword: result.temporaryPassword,
      });
      setTemporaryPasswordCleared(false);
      setShowTemporaryPassword(true);
    } catch (reason) {
      notifyError(getUserFacingError(reason));
    } finally {
      setRegeneratingPassword(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);

    try {
      let account = pendingAccount;
      if (!account) {
        account = await createDosenAccount({ email: form.email });
        setPendingAccount(account);
      }

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
        try {
          await uploadDosenPhoto(dosen._id, photoFile);
        } catch (photoError) {
          notifyError(getUserFacingError(photoError));
        }
      }

      setCreatedDosenId(dosen._id);
    } catch (reason) {
      notifyError(getUserFacingError(reason));
    } finally {
      setSaving(false);
    }
  }

  const credentialsPanel =
    pendingAccount?.temporaryPassword && !temporaryPasswordCleared ? (
      <Card className="border-amber-300 bg-amber-50 p-5">
        <h2 className="text-base font-bold text-amber-900">
          Temporary password, shown once
        </h2>
        <p className="mt-2 text-sm leading-6 text-amber-900">
          Give this password to the dosen through a secure channel. It is not
          emailed, and it cannot be displayed again after you leave this page.
        </p>
        <dl className="mt-4 space-y-3">
          <div>
            <dt className="text-xs font-bold uppercase tracking-wide text-amber-900">
              Email
            </dt>
            <dd className="mt-1 break-all text-sm text-amber-900">
              {pendingAccount.email}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-bold uppercase tracking-wide text-amber-900">
              Temporary password
            </dt>
            <dd className="mt-1 flex flex-wrap items-center gap-3">
              <code className="rounded bg-white px-3 py-2 text-sm font-semibold text-[var(--rams-charcoal)]">
                {showTemporaryPassword
                  ? pendingAccount.temporaryPassword
                  : "••••••••"}
              </code>
              <Button
                type="button"
                variant="secondary"
                onClick={() => void copyTemporaryPassword()}
              >
                {copied ? "Copied" : "Copy password"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() =>
                  setShowTemporaryPassword((current) => !current)
                }
              >
                {showTemporaryPassword ? "Hide password" : "Show password"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setTemporaryPasswordCleared(true)}
              >
                Clear password
              </Button>
            </dd>
          </div>
        </dl>
        <p className="mt-4 text-xs leading-5 text-amber-900">
          The dosen must change this password after signing in. Clearing it
          removes it from this page; you can generate a new one if needed.
        </p>
      </Card>
    ) : temporaryPasswordCleared && pendingAccount ? (
      <Card className="border-amber-300 bg-amber-50 p-5">
        <h2 className="text-base font-bold text-amber-900">
          Temporary password cleared
        </h2>
        <p className="mt-2 text-sm leading-6 text-amber-900">
          The password is no longer shown on this page. If you did not copy it,
          generate a new temporary password or use the reset action on the
          account.
        </p>
        <div className="mt-4">
          <Button
            type="button"
            variant="secondary"
            disabled={regeneratingPassword}
            onClick={() => void regenerateTemporaryPassword()}
          >
            {regeneratingPassword
              ? "Generating..."
              : "Generate a new temporary password"}
          </Button>
        </div>
      </Card>
    ) : null;

  if (createdDosenId) {
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
            title="Dosen created"
            description="The account and profile are ready. Copy the temporary password before leaving this page."
          />

          {credentialsPanel}

          <div className="flex flex-wrap gap-3">
            <LinkButton href={`/dashboard/dosen/${createdDosenId}`}>
              Continue to dosen profile
            </LinkButton>
            <LinkButton href="/dashboard/dosen" variant="secondary">
              Back to dosen list
            </LinkButton>
          </div>
        </div>
      </div>
    );
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

        {credentialsPanel}

        {pendingAccount && (
          <Card className="border-amber-300 bg-amber-50 p-4">
            <p className="text-sm leading-6 text-amber-900">
              The authentication account was created, but the profile was not
              saved yet. Fix the form fields and retry. The temporary password
              above remains valid.
            </p>
          </Card>
        )}

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
              {saving
                ? "Saving..."
                : pendingAccount
                  ? "Retry profile creation"
                  : "Create dosen"}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
