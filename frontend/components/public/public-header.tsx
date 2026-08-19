"use client";

import Image from "next/image";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import LanguageSwitcher from "./language-switcher";

const links = [
  ["people", "/team"],
  ["research", "/research"],
  ["publications", "/publications"],
  ["news", null],
  ["participate", "/contact"],
  ["partners", "/partners"],
] as const;

function isActive(pathname: string, href: string) {
  if (href === "/publications") return pathname.startsWith("/publications");
  if (href === "/projects") return pathname.startsWith("/projects");
  if (href === "/partners") return pathname.startsWith("/partners");
  return pathname === href;
}

export default function PublicHeader() {
  const pathname = usePathname();
  const t = useTranslations("nav");
  const brand = useTranslations("brand");
  const a11y = useTranslations("a11y");
  const [open, setOpen] = useState(false);

  return <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-white text-[var(--charcoal)]">
    <div className="mx-auto flex h-20 max-w-[1280px] items-center justify-between gap-6 px-5 sm:px-8 lg:px-10">
      <Link href="/" className="flex items-center gap-3" aria-label={a11y("home")}>
        <div className="relative h-10 w-[80px] shrink-0"><Image src="/assets/rams-logo.png" alt="" fill sizes="80px" className="object-contain" priority /></div>
        <div className="flex flex-col">
          <span className="font-display font-bold text-[var(--navy)]">{brand("laboratory")}</span>
          <span className="text-[0.65rem] text-[var(--gray)]">{brand("technicalLine")}</span>
        </div>
      </Link>

      <nav className="hidden items-center gap-6 lg:flex" aria-label={a11y("primaryNav")}>
        {links.map(([key, href]) => href ? <Link key={key} href={href} className={`text-sm font-medium transition ${isActive(pathname, href) ? "text-[var(--rams-red)]" : "text-[var(--charcoal)] hover:text-[var(--rams-red)]"}`}>{t(key)}</Link> : <span key={key} aria-disabled="true" className="text-sm font-medium text-[var(--gray)]">{t(key)}</span>)}
        <div className="flex items-center gap-1 border-l border-[var(--border)] pl-4">
          <LanguageSwitcher />
        </div>
      </nav>

      <div className="flex items-center lg:hidden">
        <button type="button" aria-expanded={open} aria-controls="mobile-public-navigation" aria-label={open ? a11y("closeMenu") : a11y("openMenu")} onClick={() => setOpen((value) => !value)}>
          <span className="sr-only">{a11y("menu")}</span>
          <span className="flex h-6 w-6 flex-col justify-center gap-1" aria-hidden="true">
            <span className="h-px w-6 bg-[var(--charcoal)]" />
            <span className="h-px w-6 bg-[var(--charcoal)]" />
            <span className="h-px w-6 bg-[var(--charcoal)]" />
          </span>
        </button>
      </div>
    </div>
    {open && <nav id="mobile-public-navigation" className="border-t border-[var(--border)] bg-white px-5 py-4 sm:px-8 lg:hidden" aria-label={a11y("mobileNav")}>
      <div className="grid gap-3">
        {links.map(([key, href]) => href ? <Link key={key} href={href} onClick={() => setOpen(false)} className={`text-sm font-medium transition ${isActive(pathname, href) ? "text-[var(--rams-red)]" : "text-[var(--charcoal)] hover:text-[var(--rams-red)]"}`}>{t(key)}</Link> : <span key={key} aria-disabled="true" className="text-sm font-medium text-[var(--gray)]">{t(key)}</span>)}
      </div>
      <div className="mt-4 border-t border-[var(--border)] pt-4">
        <LanguageSwitcher />
      </div>
    </nav>}
  </header>;
}
