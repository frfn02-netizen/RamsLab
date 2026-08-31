"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "@/components/providers/auth-providers";
import {
  Badge,
  Button,
  Card,
  ErrorState,
  Field,
  LoadingState,
  inputClass,
} from "@/components/ui";
import ProfilePhotoField from "@/components/dashboard/profile-photo-field";
import {
  deleteStudent,
  getStudentById,
  updateStudent,
  uploadStudentPhoto,
} from "@/lib/api/modules";
import { getUserFacingError } from "@/lib/api/errors";
import { safeHttpUrl } from "@/lib/safe-url";
import type { Student, StudentType } from "@/types/modules";

const typeLabel = (type: StudentType) =>
  type === "PHD_STUDENT"
    ? "Ph.D. Student"
    : type === "MASTER_STUDENT"
      ? "Master Student"
      : "Undergraduate Student";

export default function StudentDetail({ id }: { id: string }) {
  const { user } = useAuth();
  const router = useRouter();
  const [student, setStudent] = useState<Student | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    fullName: "",
    studentType: "PHD_STUDENT" as StudentType,
    program: "",
    specialization: "",
    bio: "",
    linkedin: "",
    isPublic: true,
  });

  useEffect(() => {
    let cancelled = false;
    getStudentById(id)
      .then((result) => {
        if (!cancelled) {
          const safeLinkedin = safeHttpUrl(result.linkedin) ?? undefined;
          const safeResult = { ...result, linkedin: safeLinkedin };
          setStudent(safeResult);
          setForm({
            fullName: result.fullName,
            studentType: result.studentType,
            program: result.program ?? "",
            specialization: result.specialization.join(", "),
            bio: result.bio ?? "",
            linkedin: safeLinkedin ?? "",
            isPublic: result.isPublic,
          });
        }
      })
      .catch((reason) => {
        if (!cancelled) setError(getUserFacingError(reason));
      });
    return () => {
      cancelled = true;
    };
  }, [id]);
  const update = (key: string, value: string | boolean) =>
    setForm((current) => ({ ...current, [key]: value }));

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const result = await updateStudent(id, {
        fullName: form.fullName,
        studentType: form.studentType,
        program: form.program || undefined,
        specialization: form.specialization
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        bio: form.bio || undefined,
        linkedin: form.linkedin || undefined,
        isPublic: form.isPublic,
      });
      const saved = photoFile
        ? await uploadStudentPhoto(id, photoFile)
        : result;
      setStudent(saved);
      setPhotoFile(null);
      setEditing(false);
    } catch (reason) {
      setError(getUserFacingError(reason));
    } finally {
      setSaving(false);
    }
  }
  async function remove() {
    if (
      !student ||
      !window.confirm(
        `Delete “${student.fullName}”? This removes the student profile.`,
      )
    )
      return;
    setDeleting(true);
    setError(null);
    try {
      await deleteStudent(student._id);
      router.push("/dashboard/students");
    } catch (reason) {
      setError(getUserFacingError(reason));
      setDeleting(false);
    }
  }

  if (!student && !error)
    return (
      <div className="p-5 sm:p-7 lg:p-9">
        <LoadingState label="Loading student" />
      </div>
    );
  if (error && !student)
    return (
      <div className="p-5 sm:p-7 lg:p-9">
        <ErrorState message={error} />
        <Link
          href="/dashboard/students"
          className="mt-5 inline-block text-sm font-bold text-[var(--rams-red)]"
        >
          ← Back to students
        </Link>
      </div>
    );
  if (!student) return null;
  return (
    <div className="p-5 sm:p-7 lg:p-9">
      <div className="mx-auto max-w-4xl space-y-7">
        <Link
          href="/dashboard/students"
          className="text-sm font-bold text-[var(--rams-red)]"
        >
          ← All students
        </Link>
        {error && <ErrorState message={error} />}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Badge tone={student.isPublic ? "green" : "neutral"}>
              {student.isPublic ? "Public" : "Private"}
            </Badge>
            <h1 className="mt-4 text-4xl font-bold">{student.fullName}</h1>
            <p className="mt-2 text-[var(--rams-gray)]">
              {typeLabel(student.studentType)}
              {student.program ? ` · ${student.program}` : ""}
            </p>
          </div>
          {user?.role === "ADMIN" && (
            <div className="flex gap-2">
              <Button
                variant="secondary"
                onClick={() => setEditing((value) => !value)}
              >
                {editing ? "Cancel" : "Edit"}
              </Button>
              <Button
                variant="danger"
                disabled={deleting}
                onClick={() => void remove()}
              >
                {deleting ? "Deleting…" : "Delete"}
              </Button>
            </div>
          )}
        </div>
        {editing ? (
          <Card className="p-6">
            <form onSubmit={save} className="space-y-5">
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
                <Field label="Directory category">
                  <select
                    className={inputClass}
                    value={form.studentType}
                    onChange={(event) =>
                      update("studentType", event.target.value as StudentType)
                    }
                  >
                    <option value="PHD_STUDENT">Ph.D. Student</option>
                    <option value="MASTER_STUDENT">Master Student</option>
                    <option value="UNDERGRADUATE_STUDENT">
                      Undergraduate Student
                    </option>
                  </select>
                </Field>
                <Field label="Program">
                  <input
                    className={inputClass}
                    value={form.program}
                    onChange={(event) => update("program", event.target.value)}
                  />
                </Field>
                <Field label="Profile photo" className="sm:col-span-2">
                  <ProfilePhotoField
                    initialUrl={student.photo}
                    onFileChange={setPhotoFile}
                    disabled={saving}
                    profileLabel="student"
                  />
                </Field>
              </div>
              <Field label="Specializations">
                <input
                  className={inputClass}
                  value={form.specialization}
                  onChange={(event) =>
                    update("specialization", event.target.value)
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
              <Field label="Bio">
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
                />{" "}
                Public profile
              </label>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : "Save changes"}
              </Button>
            </form>
          </Card>
        ) : (
          <Card className="grid gap-6 p-6 sm:grid-cols-2">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-[var(--rams-gray)]">
                Category
              </p>
              <p className="mt-2">{typeLabel(student.studentType)}</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-[var(--rams-gray)]">
                Program
              </p>
              <p className="mt-2">{student.program ?? "Not provided"}</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-[var(--rams-gray)]">
                Specializations
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {student.specialization.length ? (
                  student.specialization.map((item) => (
                    <Badge key={item}>{item}</Badge>
                  ))
                ) : (
                  <span>Not provided</span>
                )}
              </div>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-[var(--rams-gray)]">
                Photo
              </p>
              <p className="mt-2 break-all">
                {student.photo ? "Uploaded" : "Not provided"}
              </p>
            </div>
            <div className="sm:col-span-2">
              <p className="text-xs font-bold uppercase tracking-wide text-[var(--rams-gray)]">
                Bio
              </p>
              <p className="mt-2 whitespace-pre-wrap leading-7">
                {student.bio ?? "No biography provided."}
              </p>
            </div>
            {student.linkedin && (
              <a
                href={student.linkedin}
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-[var(--rams-red)]"
              >
                LinkedIn profile ↗
              </a>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}
