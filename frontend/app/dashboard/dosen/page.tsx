"use client";

import { useEffect, useState } from "react";

import Link from "next/link";
import { useAuth } from "@/components/providers/auth-providers";
import { Badge, Card, EmptyState, ErrorState, LinkButton, LoadingState, PageHeader } from "@/components/ui";
import { getDosenList } from "@/lib/api/modules";
import { getUserFacingError } from "@/lib/api/errors";
import type { Dosen } from "@/types/modules";

export default function DosenPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<Dosen[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadDosen() {
      try { const result = await getDosenList(); if (!cancelled) setItems(result); }
      catch (reason) { if (!cancelled) setError(getUserFacingError(reason)); }
      finally { if (!cancelled) setLoading(false); }
    }
    void loadDosen();
    return () => { cancelled = true; };
  }, []);

  return <div className="p-5 sm:p-7 lg:p-9"><div className="mx-auto max-w-7xl space-y-7"><PageHeader eyebrow="People" title="Dosen" description="Browse lecturer profiles and areas of specialization." action={user?.role === "ADMIN" ? <LinkButton href="/dashboard/dosen/new">Add dosen</LinkButton> : undefined} />{error && <ErrorState message={error} onRetry={() => window.location.reload()} />}{loading ? <Card><LoadingState label="Loading dosen" /></Card> : items.length === 0 ? <EmptyState title="No dosen found" description="There are no lecturer records available yet." action={user?.role === "ADMIN" ? <LinkButton href="/dashboard/dosen/new">Create the first profile</LinkButton> : undefined} /> : <Card><div className="overflow-x-auto"><table className="w-full min-w-[740px] text-left"><thead className="border-b border-black/8 bg-[var(--rams-gray-light)]"><tr>{["Name", "Employee ID", "Position", "Specialization", "Visibility", "Action"].map((heading) => <th key={heading} scope="col" className="px-5 py-4 text-xs font-bold uppercase tracking-wide text-[var(--rams-gray)]">{heading}</th>)}</tr></thead><tbody className="divide-y divide-black/8">{items.map((item) => <tr key={item._id}><td className="px-5 py-4"><Link href={`/dashboard/dosen/${item._id}`} className="font-semibold hover:text-[var(--rams-red)]">{item.fullName}</Link><p className="mt-1 text-xs text-[var(--rams-gray)]">{item.email ?? "Email not provided"}</p></td><td className="px-5 py-4 text-sm">{item.employeeId ?? "—"}</td><td className="px-5 py-4 text-sm">{item.position ?? item.title ?? "—"}</td><td className="px-5 py-4"><div className="flex flex-wrap gap-1.5">{item.specialization.map((value) => <Badge key={value}>{value}</Badge>)}</div></td><td className="px-5 py-4"><Badge tone={item.isPublic ? "green" : "neutral"}>{item.isPublic ? "Public" : "Private"}</Badge></td><td className="px-5 py-4 text-right"><Link href={`/dashboard/dosen/${item._id}`} className="text-sm font-bold text-[var(--rams-red)]">View</Link></td></tr>)}</tbody></table></div></Card>}</div></div>;
}
