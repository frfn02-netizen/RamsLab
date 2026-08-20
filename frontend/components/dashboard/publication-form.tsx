"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "@/components/providers/auth-providers";
import { Button, Card, ErrorState, Field, LoadingState, PageHeader, inputClass } from "@/components/ui";
import { createPublication, getPublication, updatePublication } from "@/lib/api/modules";
import { getUserFacingError } from "@/lib/api/errors";
import { canManagePublication, hasPermission } from "@/lib/authz";
import { PUBLICATION_TYPES, type Publication } from "@/types/modules";

type FormState = { title: string; authors: string[]; publicationType: string; year: string; journal: string; doi: string; pdfUrl: string; topics: string[]; methods: string[] };
type FormErrors = Partial<Record<"title" | "authors" | "publicationType" | "year" | "journal" | "pdfUrl", string>>;
const emptyForm = (): FormState => ({ title: "", authors: [], publicationType: "Article", year: String(new Date().getFullYear()), journal: "", doi: "", pdfUrl: "", topics: [], methods: [] });

function fromPublication(publication: Publication): FormState {
  return { title: publication.title, authors: publication.authors, publicationType: publication.publicationType || "Article", year: String(publication.year), journal: publication.journal, doi: publication.doi ?? "", pdfUrl: publication.pdfUrl ?? "", topics: publication.topics, methods: publication.methods };
}

function addValue(values: string[], value: string) {
  const next = value.trim();
  return next && !values.includes(next) ? [...values, next] : values;
}

export default function PublicationForm({ id }: { id?: string }) {
  const router = useRouter();
  const { user } = useAuth();
  const editing = Boolean(id);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [authorDraft, setAuthorDraft] = useState("");
  const [topicDraft, setTopicDraft] = useState("");
  const [methodDraft, setMethodDraft] = useState("");
  const [loading, setLoading] = useState(editing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [audit, setAudit] = useState<Publication | null>(null);
  const [canEditRecord, setCanEditRecord] = useState(true);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    getPublication(id).then((publication) => { if (!cancelled) {
      setForm(fromPublication(publication));
      setAudit(publication);
      setCanEditRecord(canManagePublication(user, publication));
    } }).catch((reason) =>
        { if (!cancelled) setError(getUserFacingError(reason)); }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id, user]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function validate() {
    const next: FormErrors = {};
    if (!form.title.trim()) next.title = "Title is required.";
    if (!form.authors.length) next.authors = "Add at least one author.";
    if (!form.publicationType.trim()) next.publicationType = "Publication type is required.";
    const year = Number(form.year);
    if (!Number.isInteger(year) || year < 1900 || year > new Date().getFullYear() + 1) next.year = "Enter a valid publication year.";
    if (!form.journal.trim()) next.journal = "Journal is required.";
    if (form.pdfUrl.trim()) {
      try { new URL(form.pdfUrl.trim()); } catch { next.pdfUrl = "Enter a valid URL."; }
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validate()) return;
    setSaving(true);
    setError(null);
    const input = { title: form.title.trim(), authors: form.authors.map((author) => author.trim()).filter(Boolean), publicationType: form.publicationType.trim(), year: Number(form.year), journal: form.journal.trim(), doi: form.doi.trim() || null, pdfUrl: form.pdfUrl.trim() || null, topics: form.topics, methods: form.methods };
    try {
      const saved = editing ? await updatePublication(id as string, input) : await createPublication(input);
      router.push(`/dashboard/publications/${saved._id}/edit`);
    } catch (reason) { setError(getUserFacingError(reason)); }
    finally { setSaving(false); }
  }

  function addAuthor() { const next = addValue(form.authors, authorDraft); if (next.length !== form.authors.length) update("authors", next); setAuthorDraft(""); }
  function addTopic() { const next = addValue(form.topics, topicDraft); if (next.length !== form.topics.length) update("topics", next); setTopicDraft(""); }
  function addMethod() { const next = addValue(form.methods, methodDraft); if (next.length !== form.methods.length) update("methods", next); setMethodDraft(""); }
  function onEnter(event: React.KeyboardEvent<HTMLInputElement>, add: () => void) { if (event.key === "Enter") { event.preventDefault(); add(); } }

  if (!hasPermission(user?.role, editing ? "publication.update" : "publication.create")) return <div className="p-5 sm:p-7 lg:p-9"><div className="mx-auto max-w-3xl"><ErrorState message="You do not have permission to manage publications." /></div></div>;
  if (editing && audit && !canEditRecord) return <div className="p-5 sm:p-7 lg:p-9"><div className="mx-auto max-w-3xl"><ErrorState message="You can only edit publications you created." /></div></div>;
  if (loading) return <div className="p-5 sm:p-7 lg:p-9"><div className="mx-auto max-w-3xl"><Card><LoadingState label="Loading publication" /></Card></div></div>;

  return <div className="p-5 sm:p-7 lg:p-9"><div className="mx-auto max-w-4xl space-y-7">
    <Link href="/dashboard/publications" className="text-sm font-bold text-[var(--rams-red)]">← Publications</Link>
    <PageHeader eyebrow="Research" title={editing ? "Edit publication" : "Add publication"} description="Publication records are shared by the admin and public Publications pages." />
    {audit && <PublicationAudit publication={audit} />}
        {error && <ErrorState message={error} />}
    <Card className="p-6"><form onSubmit={submit} 
          className="space-y-6">
      <Field label="Title *" htmlFor="publication-title" error={errors.title}><input id="publication-title" required className={inputClass} value={form.title} onChange={(event) => update("title", event.target.value)} /></Field>
      <Field label="Authors *" error={errors.authors}><div className="flex flex-wrap gap-2">{form.authors.map((author) => <span key={author} className="inline-flex items-center gap-2 rounded-full bg-[var(--rams-gray-light)] px-3 py-1.5 text-sm">{author}<button type="button" className="font-bold text-[var(--rams-gray)] hover:text-[var(--rams-red)]" onClick={() => update("authors", form.authors.filter((item) => item !== author))} aria-label={`Remove author ${author}`}>×</button></span>)}</div><div className="mt-3 flex gap-2"><input aria-label="New author" className={inputClass} placeholder="Add an author" value={authorDraft} onChange={(event) => setAuthorDraft(event.target.value)} onKeyDown={(event) => onEnter(event, addAuthor)} /><Button type="button" variant="secondary" onClick={addAuthor}>Add author</Button></div></Field>
      <Field label="Publication Type *" htmlFor="publication-type" error={errors.publicationType}><select id="publication-type" required className={inputClass} value={form.publicationType} onChange={(event) => update("publicationType", event.target.value)}>{PUBLICATION_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}</select></Field>
      <div className="grid gap-5 sm:grid-cols-2"><Field label="Year *" htmlFor="publication-year" error={errors.year}><input id="publication-year" required type="number" min="1900" max={new Date().getFullYear() + 1} step="1" className={inputClass} value={form.year} onChange={(event) => update("year", event.target.value)} /></Field><Field label="Journal / Venue *" htmlFor="publication-journal" error={errors.journal}><input id="publication-journal" required className={inputClass} value={form.journal} onChange={(event) => update("journal", event.target.value)} /></Field><Field label="DOI" htmlFor="publication-doi"><input id="publication-doi" className={inputClass} placeholder="10.0000/example" value={form.doi} onChange={(event) => update("doi", event.target.value)} /></Field><Field label="Publication URL / PDF URL" htmlFor="publication-url" error={errors.pdfUrl}><input id="publication-url" type="url" className={inputClass} placeholder="https://doi.org/... or journal page" value={form.pdfUrl} onChange={(event) => update("pdfUrl", event.target.value)} /></Field></div>
      <TagField label="Topics" values={form.topics} draft={topicDraft} setDraft={setTopicDraft} add={addTopic} remove={(value) => update("topics", form.topics.filter((item) => item !== value))} onEnter={onEnter} placeholder="Hydrodynamics" />
      <TagField label="Methods" values={form.methods} draft={methodDraft} setDraft={setMethodDraft} add={addMethod} remove={(value) => update("methods", form.methods.filter((item) => item !== value))} onEnter={onEnter} placeholder="CFD" />
      <div className="flex flex-wrap gap-3 border-t border-black/8 pt-5"><Button type="submit" disabled={saving}>{saving ? "Saving…" : editing ? "Save publication" : "Save publication"}</Button><Link href="/dashboard/publications" className="inline-flex min-h-10 items-center px-4 text-sm font-semibold text-[var(--rams-gray)]">Cancel</Link></div>
    </form></Card>
  </div></div>;
}

function PublicationAudit({ publication }: { publication: Publication }) {
  const formatDate = (value: string | undefined) => value ? new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value)) : "—";
  const identity = (email: string | null | undefined, id: string | null | undefined) => email ?? (id ? `User ${id.slice(0, 8)}…` : "Unknown");
  return <Card className="border-black/5 bg-[var(--rams-gray-light)] p-4 text-xs text-[var(--rams-gray)]"><div className="grid gap-2 sm:grid-cols-2"><p>Created by: <span className="font-semibold text-[var(--rams-charcoal)]">{identity(publication.createdByEmail, publication.createdBy)}</span></p><p>Created: <span className="font-semibold text-[var(--rams-charcoal)]">{formatDate(publication.createdAt)}</span></p><p>Last updated by: <span className="font-semibold text-[var(--rams-charcoal)]">{identity(publication.updatedByEmail, publication.updatedBy)}</span></p><p>Updated: <span className="font-semibold text-[var(--rams-charcoal)]">{formatDate(publication.updatedAt)}</span></p></div></Card>;
}

function TagField({ label, values, draft, setDraft, add, remove, onEnter, placeholder }: { label: string; values: string[]; draft: string; setDraft: (value: string) => void; add: () => void; remove: (value: string) => void; onEnter: (event: React.KeyboardEvent<HTMLInputElement>, add: () => void) => void; placeholder: string }) {
  return <Field label={label}><div className="flex flex-wrap gap-2">{values.map((value) => <span key={value} className="inline-flex items-center gap-2 rounded-full bg-[var(--rams-gray-light)] px-3 py-1.5 text-sm">{value}<button type="button" className="font-bold text-[var(--rams-gray)] hover:text-[var(--rams-red)]" onClick={() => remove(value)} aria-label={`Remove ${label.toLowerCase()} ${value}`}>×</button></span>)}</div><div className="mt-3 flex gap-2"><input aria-label={`New ${label.toLowerCase()}`} className={inputClass} placeholder={placeholder} value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => onEnter(event, add)} /><Button type="button" variant="secondary" onClick={add}>Add {label.toLowerCase().slice(0, -1)}</Button></div></Field>;
}
