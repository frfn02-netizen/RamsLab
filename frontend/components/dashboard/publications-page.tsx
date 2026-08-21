"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/providers/auth-providers";
import { Button, Card, EmptyState, ErrorState, LinkButton, LoadingState, PageHeader, inputClass } from "@/components/ui";
import { deletePublication, getPublications } from "@/lib/api/modules";
import { getUserFacingError } from "@/lib/api/errors";
import { canManagePublication, hasPermission } from "@/lib/authz";
import type { Publication } from "@/types/modules";
import SuccessToast from "./success-toast";

export default function PublicationsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [publications, setPublications] = useState<Publication[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const showSavedNotice = searchParams.get("saved") === "1";

  const load = useCallback(async (value = search) => {
    setLoading(true);
    setError(null);
    try { setPublications(await getPublications({ search: value, limit: 100 })); }
    catch (reason) { setError(getUserFacingError(reason)); }
    finally { setLoading(false); }
  }, [search]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 250);
    return () => window.clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    if (!showSavedNotice) return;
    const timeout = window.setTimeout(() => router.replace("/dashboard/publications", { scroll: false }), 4500);
    return () => window.clearTimeout(timeout);
  }, [router, showSavedNotice]);

  async function remove(publication: Publication) {
    if (!window.confirm(`Delete “${publication.title}”? This action cannot be undone.`)) return;
    setDeletingId(publication._id);
    setError(null);
    try { await deletePublication(publication._id); setPublications((current) => current.filter((item) => item._id !== publication._id)); }
    catch (reason) { setError(getUserFacingError(reason)); }
    finally { setDeletingId(null); }
  }

  const canCreate = hasPermission(user?.role, "publication.create");

  return <div className="p-5 sm:p-7 lg:p-9">{showSavedNotice && <SuccessToast message="Publication saved successfully." onClose={() => router.replace("/dashboard/publications", { scroll: false })} />}<div className="mx-auto max-w-7xl space-y-7">
    <PageHeader eyebrow="Research" title="Publications" description="Manage the publication records used by the public RAMS Publications page." 
    action={canCreate ?
    <LinkButton href="/dashboard/publications/new">Add publication</LinkButton> : undefined} />
    <Card className="p-4"><label htmlFor="admin-publication-search" 
          className="sr-only">Search publications</label><input id="admin-publication-search" type="search" 
          className={inputClass} placeholder="Search publications, authors, topics…" value={search} onChange={(event) => setSearch(event.target.value)} /></Card>
    {error && <ErrorState message={error} onRetry={() => void load()} />}
    {loading ? <Card><LoadingState label="Loading publications" /></Card> : publications.length === 0 ? <EmptyState
          title={search ? "No publications found" : "No publications yet"}
          description={search ? "Try another search." : "Create the first publication record for the public page."}
          action={canCreate && !search ? <LinkButton href="/dashboard/publications/new">Add publication</LinkButton> : undefined} /> : <Card><div
          className="overflow-x-auto"><table className="w-full min-w-[980px] text-left"><thead className="border-b border-black/8 bg-[var(--rams-gray-light)]"><tr>{
            ["Title", "Type", "Year", "Journal", "Authors", "Action"].map((heading) => <th key={heading} scope="col" 
          className="px-5 py-4 text-xs font-bold uppercase tracking-wide text-[var(--rams-gray)]">{heading}</th>)}</tr></thead><tbody 
          className="divide-y divide-black/8">{publications.map((publication) => <tr key={publication._id}><td 
          className="max-w-md px-5 py-4">{canManagePublication(user, publication) ? <Link href={`/dashboard/publications/${publication._id}/edit`} className="font-semibold hover:text-[var(--rams-red)]">{publication.title}</Link> : <p className="font-semibold">{publication.title}</p>}<p
          className="mt-1 text-xs text-[var(--rams-gray)]">{publication.doi ?? "No DOI"}</p></td><td 
          className="px-5 py-4 text-sm text-[var(--rams-gray)]">{publication.publicationType || "Article"}</td><td 
          className="px-5 py-4 text-sm">{publication.year}</td><td className="px-5 py-4 text-sm">{publication.journal}</td><td 
          className="max-w-xs px-5 py-4 text-sm text-[var(--rams-gray)]">{publication.authors.join(", ")}</td><td 
          className="px-5 py-4 text-right"><div 
          className="flex justify-end gap-2">{canManagePublication(user, publication) && <><LinkButton href={`/dashboard/publications/${publication._id}/edit`} variant="secondary">Edit</LinkButton><Button
                    variant="danger" disabled={deletingId === publication._id} onClick={() => void remove(publication)}>{deletingId === publication._id ? 
                    "Deleting…" : "Delete"}</Button></>}</div></td></tr>)}</tbody></table></div></Card>}
  </div></div>;
}
