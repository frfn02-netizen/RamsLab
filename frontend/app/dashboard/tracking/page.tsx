import Link from "next/link";

import { Card, PageHeader } from "@/components/ui";

export default function TrackingIndexPage() {
  return <div className="p-5 sm:p-7 lg:p-9"><div className="mx-auto max-w-4xl space-y-7"><PageHeader eyebrow="Alumni journey" title="Tracking" description="Tracking events are managed from an individual alumni profile." /><Card className="p-6"><p className="text-sm leading-7 text-[var(--rams-gray)]">Choose an alumni profile to review or record graduation, employment, education, and other career milestones.</p><Link href="/dashboard/alumni" className="mt-5 inline-flex min-h-10 items-center rounded-md bg-[var(--rams-red)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--rams-red-dark)]">Browse alumni</Link></Card></div></div>;
}
