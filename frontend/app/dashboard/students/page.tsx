"use client";

import Link from "next/link";
import { useAuth } from "@/components/providers/auth-providers";
import { Badge, Card, EmptyState, ErrorState, LinkButton, LoadingState, PageHeader } from "@/components/ui";
import { getStudentList } from "@/lib/api/modules";
import { getUserFacingError } from "@/lib/api/errors";
import type { Student } from "@/types/modules";
import { useEffect, useState } from "react";

const typeLabel = (type: Student["studentType"]) => type === "PHD_STUDENT" ? "Ph.D. Student" : "Undergraduate Student";

export default function StudentsPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getStudentList()
      .then((result) => { if (!cancelled) setItems(result); })
      .catch((reason) => { if (!cancelled) setError(getUserFacingError(reason)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return <div className="p-5 sm:p-7 lg:p-9"><div className="mx-auto max-w-7xl space-y-7"><PageHeader eyebrow="People" title="Students" description="Manage Ph.D. and undergraduate student profiles for the public People directory." action={user?.role === "ADMIN" ? <LinkButton href="/dashboard/students/new">Add student</LinkButton> : undefined} />{error && <ErrorState message={error} onRetry={() => window.location.reload()} />}{loading ? <Card><LoadingState label="Loading students" /></Card> : items.length === 0 ? <EmptyState title="No students found" description="Student profiles will appear in the public People directory when they are created and published." action={user?.role === "ADMIN" ? <LinkButton href="/dashboard/students/new">Create the first profile</LinkButton> : undefined} /> : <Card><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left"><thead className="border-b border-black/8 bg-[var(--rams-gray-light)]"><tr>{["Name", "Type", "Program", "Specialization", "Visibility", "Action"].map((heading) => <th key={heading} scope="col" className="px-5 py-4 text-xs font-bold uppercase tracking-wide text-[var(--rams-gray)]">{heading}</th>)}</tr></thead><tbody className="divide-y divide-black/8">{items.map((item) => <tr key={item._id}><td className="px-5 py-4"><Link href={`/dashboard/students/${item._id}`} className="font-semibold hover:text-[var(--rams-red)]">{item.fullName}</Link></td><td className="px-5 py-4"><Badge tone="neutral">{typeLabel(item.studentType)}</Badge></td><td className="px-5 py-4 text-sm">{item.program ?? "—"}</td><td className="px-5 py-4 text-sm">{item.specialization.join(" · ") || "—"}</td><td className="px-5 py-4"><Badge tone={item.isPublic ? "green" : "neutral"}>{item.isPublic ? "Public" : "Private"}</Badge></td><td className="px-5 py-4 text-right"><Link href={`/dashboard/students/${item._id}`} className="text-sm font-bold text-[var(--rams-red)]">View</Link></td></tr>)}</tbody></table></div></Card>}</div></div>;
}
