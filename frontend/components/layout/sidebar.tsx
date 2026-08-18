"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/providers/auth-providers";

const navigation = [["Dashboard", "/dashboard"], ["Alumni", "/dashboard/alumni"], ["Dosen", "/dashboard/dosen"], ["Projects", "/dashboard/projects"], ["Partners", "/dashboard/partners"], ["Tracking", "/dashboard/tracking"]] as const;

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
        {navigation.map(([label, href]) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return <Link key={href} href={href} className={`block border-l-2 px-3 py-2.5 text-sm font-semibold transition ${active ? "border-[var(--rams-red)] bg-white/10 text-white" : "border-transparent text-white/60 hover:bg-white/5 hover:text-white"}`}>{label}</Link>;
        })}
      </nav>

      <div className="border-t border-white/10 px-6 py-4 text-xs text-white/45">Signed in as <span className="font-semibold text-white/70">{user?.role}</span></div>
    </aside>
  );
}
