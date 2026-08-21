"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/components/providers/auth-providers";

const navigation = [
  ["Dashboard", "/dashboard"],
  ["Homepage", "/dashboard/content/homepage"],
  ["Publications", "/dashboard/content/publications"],
  ["Contact", "/dashboard/content/contact"],
  ["Footer", "/dashboard/content/footer"],
  ["Research Areas", "/dashboard/research"],
  ["Projects", "/dashboard/projects"],
  ["Dosen", "/dashboard/dosen"],
  ["Students", "/dashboard/students"],
  ["Alumni", "/dashboard/alumni"],
  ["Partners", "/dashboard/partners"],
  ["Tracking", "/dashboard/tracking"],
] as const;

export default function Header() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <header className="relative flex min-h-16 items-center justify-between border-b border-[#D9E2EA] bg-white px-4 sm:px-6">
      <div className="flex min-w-0 items-center gap-3 sm:gap-5">
        <Link href="/" className="flex shrink-0 items-center gap-2.5" aria-label="RAMS Laboratory home">
          <span className="relative h-9 w-9 shrink-0 bg-white">
            <Image src="/assets/rams-logo.png" alt="" fill sizes="36px" className="object-contain" />
          </span>
          <span className="hidden font-display text-sm font-semibold text-[var(--rams-charcoal)] sm:block">RAMS Laboratory</span>
        </Link>
        <span className="hidden h-8 w-px bg-[#D9E2EA] sm:block" aria-hidden="true" />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[var(--rams-charcoal)]">Management console</p>
          <p className="hidden truncate text-xs text-[var(--rams-gray)] sm:block">Research and academic Management</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden text-right sm:block">
          <p className="max-w-48 truncate text-sm font-semibold text-[var(--rams-charcoal)]">{user?.email ?? "Authenticated user"}</p>
          <span className="mt-1 inline-flex rounded-full bg-[#FCEAEC] px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-[0.12em] text-[var(--rams-red-dark)]">{user?.role ?? "User"}</span>
        </div>
        <button type="button" aria-expanded={open} aria-controls="mobile-dashboard-navigation" onClick={() => setOpen((value) => !value)} className="rounded-md border border-[#C6D4DF] px-3 py-2 text-sm font-semibold text-[var(--rams-charcoal)] transition hover:border-[var(--rams-red)] hover:text-[var(--rams-red)] lg:hidden">Menu</button>
        <button type="button" onClick={() => void logout()} className="hidden rounded-md bg-[var(--rams-red)] px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-[var(--rams-red-dark)] sm:block">Logout</button>
      </div>

      {open && (
        <nav id="mobile-dashboard-navigation" className="absolute right-4 top-14 z-20 w-56 border border-[#D9E2EA] bg-white p-2 shadow-[0_12px_30px_rgba(16,38,61,0.12)] lg:hidden" aria-label="Dashboard navigation">
          {navigation.map(([label, href]) => <Link key={href} href={href} onClick={() => setOpen(false)} className="block px-3 py-2.5 text-sm font-semibold text-[var(--rams-charcoal)] transition hover:bg-[var(--rams-gray-light)] hover:text-[var(--rams-red)]">{label}</Link>)}
          <button type="button" onClick={() => void logout()} className="mt-1 w-full border-t border-[#D9E2EA] px-3 py-2.5 text-left text-sm font-semibold text-[var(--rams-red)]">Logout</button>
        </nav>
      )}
    </header>
  );
}
