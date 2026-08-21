"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button, Card, ErrorState, Field, PageHeader, inputClass } from "@/components/ui";
import { createStudent } from "@/lib/api/modules";
import { getUserFacingError } from "@/lib/api/errors";
import type { StudentType } from "@/types/modules";

export default function CreateStudent() {
  const router = useRouter();
  const [form, setForm] = useState({ fullName: "", studentType: "PHD_STUDENT" as StudentType, program: "", specialization: "", photo: "", bio: "", linkedin: "", isPublic: true });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const update = (key: string, value: string | boolean) => setForm((current) => ({ ...current, [key]: value }));

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const student = await createStudent({ fullName: form.fullName, studentType: form.studentType, program: form.program || undefined, specialization: form.specialization.split(",").map((item) => item.trim()).filter(Boolean), photo: form.photo || undefined, bio: form.bio || undefined, linkedin: form.linkedin || undefined, isPublic: form.isPublic });
      router.push(`/dashboard/students/${student._id}`);
    } catch (reason) {
      setError(getUserFacingError(reason));
    } finally {
      setSaving(false);
    }
  }

  return <div className="p-5 sm:p-7 lg:p-9"><div className="mx-auto max-w-3xl space-y-7"><Link href="/dashboard/students" className="text-sm font-bold text-[var(--rams-red)]">← Students</Link><PageHeader eyebrow="People" title="Add student" description="Create a student profile and choose the directory category that represents the current academic status." />{error && <ErrorState message={error} />}<Card className="p-6"><form onSubmit={submit} className="space-y-5"><div className="grid gap-5 sm:grid-cols-2"><Field label="Full name"><input required minLength={2} className={inputClass} value={form.fullName} onChange={(event) => update("fullName", event.target.value)} /></Field><Field label="Directory category"><select className={inputClass} value={form.studentType} onChange={(event) => update("studentType", event.target.value as StudentType)}><option value="PHD_STUDENT">Ph.D. Student</option><option value="UNDERGRADUATE_STUDENT">Undergraduate Student</option></select></Field><Field label="Program"><input className={inputClass} placeholder="Marine Engineering" value={form.program} onChange={(event) => update("program", event.target.value)} /></Field><Field label="Profile photo URL"><input type="url" className={inputClass} value={form.photo} onChange={(event) => update("photo", event.target.value)} /></Field><Field label="LinkedIn URL"><input type="url" className={inputClass} value={form.linkedin} onChange={(event) => update("linkedin", event.target.value)} /></Field></div><Field label="Specializations"><input className={inputClass} placeholder="Reliability, Marine systems" value={form.specialization} onChange={(event) => update("specialization", event.target.value)} /><p className="mt-1 text-xs text-[var(--rams-gray)]">Separate multiple entries with commas.</p></Field><Field label="Bio"><textarea className={`${inputClass} min-h-28`} value={form.bio} onChange={(event) => update("bio", event.target.value)} /></Field><label className="flex items-center gap-3 text-sm font-semibold"><input type="checkbox" checked={form.isPublic} onChange={(event) => update("isPublic", event.target.checked)} /> Publish this profile in the public People directory</label><Button type="submit" disabled={saving}>{saving ? "Creating…" : "Create student"}</Button></form></Card></div></div>;
}
