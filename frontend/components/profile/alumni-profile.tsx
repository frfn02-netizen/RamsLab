"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/auth-providers";
import {
  Button,
  Card,
  ErrorState,
  Field,
  LoadingState,
  PageHeader,
  inputClass,
} from "@/components/ui";
import { getMyAlumni, updateMyAlumni } from "@/lib/api/alumni";
import { uploadMyAlumniPhoto } from "@/lib/api/alumni";
import ProfilePhotoField from "@/components/dashboard/profile-photo-field";
import AlumniReviewStatus from "@/components/profile/alumni-review-status";
import { getUserFacingError } from "@/lib/api/errors";
import type { Alumni, AlumniStatus } from "@/types/alumni";
import SuccessToast from "@/components/dashboard/success-toast";

const statuses: AlumniStatus[] = [
  "WORKING",
  "STUDYING",
  "ENTREPRENEUR",
  "SEEKING_JOB",
  "OTHER",
];

const profileInputClass = `${inputClass} placeholder:opacity-50`;

const label = (value: string) =>
  value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

function SectionHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-4 border-b border-black/8 pb-3">
      <h2 className="text-lg font-semibold text-[var(--rams-charcoal)]">
        {title}
      </h2>
      {subtitle && (
        <p className="mt-1 text-sm text-[var(--rams-gray)]">{subtitle}</p>
      )}
    </div>
  );
}

export default function AlumniProfile() {
  const { logout, status, user } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<Alumni | null>(null);
  const [form, setForm] = useState({
    fullName: "",
    nim: "",
    angkatan: "",
    program: "",
    phone: "",
    location: "",
    currentStatus: "" as AlumniStatus | "",
    otherStatus: "",
    currentCompany: "",
    currentPosition: "",
    linkedin: "",
    bio: "",
    isPublic: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [registrationNotice, setRegistrationNotice] = useState<string | null>(
    null,
  );
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);

  useEffect(() => {
    const notice = window.sessionStorage.getItem(
      "rams_alumni_registration_notice",
    );
    if (!notice) return;
    window.sessionStorage.removeItem("rams_alumni_registration_notice");
    setRegistrationNotice(notice);
  }, []);

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
          setProfileLoaded(true);
          setForm({
            fullName: result.fullName,
            nim: result.nim ?? "",
            angkatan: result.angkatan ? String(result.angkatan) : "",
            program: result.program ?? "",
            phone: result.phone ?? "",
            location: result.location ?? "",
            currentStatus: result.currentStatus ?? "",
            otherStatus: result.otherStatus ?? "",
            currentCompany: result.currentCompany ?? "",
            currentPosition: result.currentPosition ?? "",
            linkedin: result.linkedin ?? "",
            bio: result.bio ?? "",
            isPublic: result.isPublic,
          });
        }
      })
      .catch((reason) => {
        if (!cancelled) {
          setError(getUserFacingError(reason));
          setProfileLoaded(true);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [status, user]);

  const update = (key: string, value: string | boolean) =>
    setForm((current) => ({ ...current, [key]: value }));

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccessMessage(null);
    try {
      let result = await updateMyAlumni({
        fullName: form.fullName,
        nim: form.nim || undefined,
        angkatan: form.angkatan ? Number(form.angkatan) : undefined,
        program: form.program || undefined,
        phone: form.phone || undefined,
        location: form.location || undefined,
        currentStatus: (form.currentStatus as AlumniStatus) || undefined,
        // Send an empty value when leaving Other so a previously saved custom
        // status is cleared instead of remaining on the profile.
        otherStatus:
          form.currentStatus === "OTHER" ? form.otherStatus || undefined : "",
        currentCompany: form.currentCompany || undefined,
        currentPosition: form.currentPosition || undefined,
        linkedin: form.linkedin || undefined,
        bio: form.bio || undefined,
        isPublic: form.isPublic,
      });
      if (photoFile) result = await uploadMyAlumniPhoto(photoFile);
      setPhotoFile(null);
      setProfile(result);
      setProfileLoaded(true);
      // Re-sync from the server response: the backend owns academic identity
      // (it may keep an existing NIM / batch / program), so the form must
      // always show what is actually stored instead of the typed value.
      setForm((current) => ({
        ...current,
        fullName: result.fullName ?? current.fullName,
        nim: result.nim ?? current.nim,
        angkatan: result.angkatan ? String(result.angkatan) : current.angkatan,
        program: result.program ?? current.program,
      }));
      // The backend decides completeness; never claim a profile is complete
      // while the server still reports missing required fields.
      setSuccessMessage(
        result.profileCompleted
          ? "Profile completed successfully"
          : "Profile saved. Your profile is pending review.",
      );
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

  if (profileLoaded && !profile && !error)
    return (
      <div className="p-5 sm:p-7 lg:p-9">
        <ErrorState message="Your alumni profile could not be found." />
      </div>
    );

  return (
    <div className="min-h-screen bg-[var(--paper)]">
      {registrationNotice && (
        <SuccessToast
          message={registrationNotice}
          onClose={() => setRegistrationNotice(null)}
        />
      )}
      {successMessage && (
        <SuccessToast
          message={successMessage}
          onClose={() => setSuccessMessage(null)}
        />
      )}
      <div className="border-b border-[var(--border)] bg-white px-5 sm:px-8">
        <div className="mx-auto flex max-w-[880px] items-center justify-between py-4">
          <Link href="/" className="flex items-center gap-2.5">
            <Image
              src="/assets/rams-logo.png"
              alt="RAMS"
              width={64}
              height={64}
              className="h-16 w-auto"
              priority
            />
            <span className="font-display text-lg font-semibold tracking-[-0.02em] text-[var(--rams-red)]">
              RAMS
            </span>
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/alumni/history"
              className="text-sm font-semibold text-[var(--gray)] hover:text-[var(--navy)]"
            >
              Change History
            </Link>
            <span className="text-sm text-[var(--gray)]">{user.email}</span>
            <button
              onClick={() => void logout()}
              className="text-sm font-semibold text-[var(--rams-red)] hover:text-[var(--navy)]"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
      <div className="p-5 sm:p-8">
        <div className="mx-auto max-w-[880px] space-y-6">
          <PageHeader
            title="My Alumni Profile"
            description="Complete your profile so the RAMS community can recognize your journey"
            titleClassName="text-[var(--rams-red)]"
          />

          {error && <ErrorState message={error} />}

          {profile && (
            <AlumniReviewStatus
              reviewStatus={profile.reviewStatus}
              reviewNote={profile.reviewNote}
            />
          )}

          <Card className="p-5 sm:p-6">
            <form onSubmit={save} className="space-y-6">
              {/* Profile Photo Section */}
              <section>
                <SectionHeader
                  title="Profile Photo"
                  subtitle="Required before an admin can publish your profile."
                />
                <ProfilePhotoField
                  initialUrl={profile?.photo}
                  onFileChange={setPhotoFile}
                  disabled={saving}
                  profileLabel="alumni"
                />
              </section>

              {/* Personal Information Section */}
              <section>
                <SectionHeader
                  title="Personal Information"
                  subtitle="Basic information about you."
                />
                <div className="space-y-4">
                  <Field label="Full Name" htmlFor="fullName">
                    <input
                      id="fullName"
                      required
                      minLength={2}
                      className={profileInputClass}
                      value={form.fullName}
                      onChange={(event) =>
                        update("fullName", event.target.value)
                      }
                    />
                  </Field>

                  <Field label="Email *" htmlFor="email">
                    <input
                      id="email"
                      type="email"
                      readOnly
                      className={`${profileInputClass} cursor-not-allowed bg-[var(--rams-gray-light)]`}
                      value={profile?.accountEmail ?? user?.email ?? ""}
                    />
                    <p className="mt-1 text-xs text-[var(--rams-gray)]">
                      Your account email. If you need to change your email,
                      please contact the administrator.
                    </p>
                  </Field>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Phone" htmlFor="phone">
                      <input
                        id="phone"
                        className={profileInputClass}
                        value={form.phone}
                        onChange={(event) =>
                          update("phone", event.target.value)
                        }
                      />
                    </Field>
                    <Field label="Current Location" htmlFor="location">
                      <input
                        id="location"
                        className={profileInputClass}
                        placeholder="City / Province where you currently live"
                        value={form.location}
                        onChange={(event) =>
                          update("location", event.target.value)
                        }
                      />
                    </Field>
                  </div>
                </div>
              </section>

              {/* Academic Information Section */}
              <section>
                <SectionHeader
                  title="Academic Information"
                  subtitle="Your academic background at ITS."
                />
                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <Field label="Program *" htmlFor="program">
                      <input
                        id="program"
                        required
                        className={profileInputClass}
                        placeholder="e.g. Naval Architecture"
                        value={form.program}
                        onChange={(event) =>
                          update("program", event.target.value)
                        }
                      />
                    </Field>
                    <Field label="NIM *" htmlFor="nim">
                      <input
                        id="nim"
                        required
                        className={profileInputClass}
                        value={form.nim}
                        onChange={(event) => update("nim", event.target.value)}
                      />
                    </Field>
                    <Field label="P (Angkatan) *" htmlFor="angkatan">
                      <input
                        id="angkatan"
                        required
                        type="number"
                        min="1"
                        max="99"
                        className={profileInputClass}
                        value={form.angkatan}
                        onChange={(event) =>
                          update("angkatan", event.target.value)
                        }
                      />
                    </Field>
                    <Field label="Status *" htmlFor="currentStatus">
                      <select
                        id="currentStatus"
                        required
                        className={profileInputClass}
                        value={form.currentStatus}
                        onChange={(event) => {
                          update("currentStatus", event.target.value);
                          if (event.target.value !== "OTHER") {
                            update("otherStatus", "");
                          }
                        }}
                      >
                        <option value="" disabled>
                          Select status
                        </option>
                        {statuses.map((s) => (
                          <option key={s} value={s}>
                            {label(s)}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </div>

                  {form.currentStatus === "OTHER" && (
                    <Field label="Other Status" htmlFor="otherStatus">
                      <input
                        id="otherStatus"
                        className={profileInputClass}
                        placeholder="Enter your status (e.g. Freelancer, Researcher, etc.)"
                        value={form.otherStatus}
                        onChange={(event) =>
                          update("otherStatus", event.target.value)
                        }
                      />
                      <p className="mt-1 text-xs text-[var(--rams-gray)]">
                        Only fill this if you selected &apos;Other&apos; in the
                        status above.
                      </p>
                    </Field>
                  )}
                </div>
              </section>

              {/* Professional Information Section */}
              <section>
                <SectionHeader
                  title="Professional Information"
                  subtitle="Your current work or study details."
                />
                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Company" htmlFor="currentCompany">
                      <input
                        id="currentCompany"
                        className={profileInputClass}
                        value={form.currentCompany}
                        onChange={(event) =>
                          update("currentCompany", event.target.value)
                        }
                      />
                    </Field>
                    <Field label="Position" htmlFor="currentPosition">
                      <input
                        id="currentPosition"
                        className={profileInputClass}
                        value={form.currentPosition}
                        onChange={(event) =>
                          update("currentPosition", event.target.value)
                        }
                      />
                    </Field>
                  </div>
                  <Field label="LinkedIn URL" htmlFor="linkedin">
                    <input
                      id="linkedin"
                      type="url"
                      className={profileInputClass}
                      value={form.linkedin}
                      onChange={(event) =>
                        update("linkedin", event.target.value)
                      }
                    />
                  </Field>
                </div>
              </section>

              {/* Bio Section */}
              <section>
                <SectionHeader title="Bio" />
                <Field label="Bio" htmlFor="bio">
                  <textarea
                    id="bio"
                    className={`${profileInputClass} min-h-[110px]`}
                    placeholder="Optional"
                    value={form.bio}
                    onChange={(event) => update("bio", event.target.value)}
                  />
                </Field>
              </section>

              {/* Visibility Section */}
              <section>
                <label className="flex items-center gap-3 text-sm font-semibold">
                  <input
                    type="checkbox"
                    checked={Boolean(form.isPublic)}
                    onChange={(event) =>
                      update("isPublic", event.target.checked)
                    }
                    className="h-4 w-4 accent-[var(--rams-red)]"
                  />
                  Make my profile public
                </label>
              </section>

              {/* Actions */}
              <div className="flex items-center gap-3 border-t border-black/8 pt-4">
                <Button type="submit" disabled={saving}>
                  {saving ? "Saving…" : "Save Profile"}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => window.location.reload()}
                  disabled={saving}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}
