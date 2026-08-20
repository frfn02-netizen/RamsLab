"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/providers/auth-providers";
import { hasPermission } from "@/lib/authz";

const navigationGroups = [
  { label: "Overview", items: [["Dashboard", "/dashboard"]] },
  { label: "Content", items: [["Homepage", "/dashboard/content/homepage"], ["About", "/dashboard/content/about"], ["Contact", "/dashboard/content/contact"], ["Footer", "/dashboard/content/footer"]] },
  { label: "Research & Work", items: [["Research Areas", "/dashboard/research"], ["Publications", "/dashboard/publications"], ["Projects", "/dashboard/projects"]] },
  { label: "People", items: [["Dosen", "/dashboard/dosen"], ["Alumni", "/dashboard/alumni"]] },
  { label: "Ecosystem", items: [["Partners", "/dashboard/partners"]] },
  { label: "System", items: [["Tracking", "/dashboard/tracking"]] },
] as const;

export default function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-white/10 bg-[var(--rams-charcoal)] text-white lg:flex">
      <div className="border-b border-white/10 px-6 py-6">
        <Link href="/" className="flex items-center gap-3" aria-label="RAMS Laboratory home">
          <span className="relative h-11 w-11 shrink-0 bg-white p-1">
            <Image src="/assets/rams-logo.png" alt="" fill sizes="44px" className="object-contain" />
          </span>
          <span>
            <span className="block font-display text-base font-semibold text-white">RAMS Laboratory</span>
            <span className="mt-1 block text-[0.65rem] uppercase tracking-[0.15em] text-white/45">Admin portal</span>
          </span>
        </Link>
        <p className="mt-6 border-l-2 border-[var(--rams-red)] pl-3 text-xs leading-5 text-white/55">Research and academic Management</p>
      </div>

      <nav className="flex-1 space-y-1 p-4" aria-label="Dashboard navigation">
        {navigationGroups.map((group) => <div key={group.label} className="space-y-1">{group.items.filter(([, href]) => href === "/dashboard" ? hasPermission(user?.role, "dashboard.read") : href === "/dashboard/publications" ? hasPermission(user?.role, "publication.read") : user?.role === "ADMIN" || user?.role === "DOSEN").length > 0 && <p className="px-3 pb-1 pt-4 text-[0.65rem] font-bold uppercase tracking-[0.16em] text-white/35 first:pt-0">{group.label}</p>}{group.items.filter(([, href]) => href === "/dashboard" ? hasPermission(user?.role, "dashboard.read") : href === "/dashboard/publications" ? hasPermission(user?.role, "publication.read") : user?.role === "ADMIN" || user?.role === "DOSEN").map(([label, href]) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return <Link key={href} href={href} className={`block border-l-2 px-3 py-2.5 text-sm font-semibold transition ${active ? "border-[var(--rams-red)] bg-white/10 text-white" : "border-transparent text-white/60 hover:bg-white/5 hover:text-white"}`}>{label}</Link>;
        })}</div>)}
      </nav>

      <div className="border-t border-white/10 px-6 py-4 text-xs text-white/45">Signed in as <span className="font-semibold text-white/70">{user?.role}</span></div>
    </aside>
  );
}
