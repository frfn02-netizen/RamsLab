"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import DosenPhotoField from "@/components/dashboard/dosen-photo-field";
import { useToast } from "@/components/providers/toast-providers";
import {
  Button,
  Card,
  Field,
  LinkButton,
  PageHeader,
  inputClass,
} from "@/components/ui";
import { getUserFacingError } from "@/lib/api/errors";
import {
  createDosen,
  resetUserPassword,
  uploadDosenPhoto,
} from "@/lib/api/modules";
import { dosenCopy } from "@/lib/dosen-copy";

type CreatedLecturer = {
  dosenId: string;
  userId: string;
  email: string;
  temporaryPassword?: string;
  notification?: { sent: boolean; warning?: string };
};

export default function CreateDosen() {
  const { error: notifyError } = useToast();
  const copy = dosenCopy();

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
  const [created, setCreated] = useState<CreatedLecturer | null>(null);
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
    if (!created?.temporaryPassword || temporaryPasswordCleared) return;
    try {
      await navigator.clipboard.writeText(created.temporaryPassword);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      notifyError("Could not copy the password. Select it manually.");
    }
  }

  async function regenerateTemporaryPassword() {
    if (!created) return;
    setRegeneratingPassword(true);
    try {
      const result = await resetUserPassword(created.userId);
      setCreated({
        ...created,
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
      const result = await createDosen({
        email: form.email,
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
          await uploadDosenPhoto(result.dosen._id, photoFile);
        } catch (photoError) {
          notifyError(getUserFacingError(photoError));
        }
      }

      setCreated({
        dosenId: result.dosen._id,
        userId: result.dosen.userId,
        email: result.dosen.email ?? form.email,
        temporaryPassword: result.temporaryPassword,
        notification: result.notification,
      });
    } catch (reason) {
      notifyError(getUserFacingError(reason));
    } finally {
      setSaving(false);
    }
  }

  const credentialsPanel =
    created?.temporaryPassword && !temporaryPasswordCleared ? (
      <Card className="border-amber-300 bg-amber-50 p-5">
        <h2 className="text-base font-bold text-amber-900">
          {copy.temporaryPasswordTitle}
        </h2>
        <p className="mt-2 text-sm leading-6 text-amber-900">
          {copy.temporaryPasswordHint}
        </p>
        <dl className="mt-4 space-y-3">
          <div>
            <dt className="text-xs font-bold uppercase tracking-wide text-amber-900">
              Email
            </dt>
            <dd className="mt-1 break-all text-sm text-amber-900">
              {created.email}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-bold uppercase tracking-wide text-amber-900">
              Temporary password
            </dt>
            <dd className="mt-1 flex flex-wrap items-center gap-3">
              <code className="rounded bg-white px-3 py-2 text-sm font-semibold text-[var(--rams-charcoal)]">
                {showTemporaryPassword
                  ? created.temporaryPassword
                  : "••••••••"}
              </code>
              <Button
                type="button"
                variant="secondary"
                onClick={() => void copyTemporaryPassword()}
              >
                {copied ? copy.copied : copy.copyPassword}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowTemporaryPassword((current) => !current)}
              >
                {showTemporaryPassword
                  ? copy.hidePassword
                  : copy.showPassword}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setTemporaryPasswordCleared(true)}
              >
                {copy.clearPassword}
              </Button>
            </dd>
          </div>
        </dl>
      </Card>
    ) : temporaryPasswordCleared && created ? (
      <Card className="border-amber-300 bg-amber-50 p-5">
        <h2 className="text-base font-bold text-amber-900">
          {copy.temporaryPasswordClearedTitle}
        </h2>
        <p className="mt-2 text-sm leading-6 text-amber-900">
          {copy.temporaryPasswordClearedHint}
        </p>
        <div className="mt-4">
          <Button
            type="button"
            variant="secondary"
            disabled={regeneratingPassword}
            onClick={() => void regenerateTemporaryPassword()}
          >
            {regeneratingPassword
              ? copy.regenerating
              : copy.regeneratePassword}
          </Button>
        </div>
      </Card>
    ) : null;

  if (created) {
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
            title={copy.createdTitle}
            description={copy.createdDescription}
          />

          {created.notification?.sent ? (
            <Card className="border-emerald-300 bg-emerald-50 p-4">
              <p className="text-sm font-semibold text-emerald-900">
                {copy.emailSent.replace("{email}", created.email)}
              </p>
            </Card>
          ) : created.notification ? (
            <Card className="border-amber-300 bg-amber-50 p-4">
              <p className="text-sm font-semibold text-amber-900">
                {copy.emailFailed}
              </p>
            </Card>
          ) : null}

          {credentialsPanel}

          <div className="flex flex-wrap gap-3">
            <LinkButton href={`/dashboard/dosen/${created.dosenId}`}>
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
          description="Create the lecturer's login and public profile in one step."
        />

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

            <div className="space-y-2">
              <label className="flex items-center gap-3 text-sm font-semibold">
                <input
                  type="checkbox"
                  checked={form.isPublic}
                  onChange={(event) => update("isPublic", event.target.checked)}
                />
                {copy.publicProfileLabel}
              </label>
              <p className="ml-7 text-xs leading-5 text-[var(--rams-gray)]">
                {copy.publicProfileHint}
              </p>
            </div>

            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Create dosen"}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
