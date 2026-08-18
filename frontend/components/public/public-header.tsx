"use client";

import Image from "next/image";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import LanguageSwitcher from "./language-switcher";

const links = [["about", "/about"], ["research", "/research"], ["projects", "/projects"], ["partners", "/partners"], ["team", "/team"]] as const;

function isActive(pathname: string, href: string) {
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
        {links.map(([key, href]) => <Link key={href} href={href} className={`text-sm font-medium transition ${isActive(pathname, href) ? "text-[var(--rams-red)]" : "text-[var(--charcoal)] hover:text-[var(--rams-red)]"}`}>{t(key)}</Link>)}
        <div className="flex items-center gap-1 border-l border-[var(--border)] pl-4">
          <LanguageSwitcher />
        </div>
        <Link href="/contact" className="bg-[var(--navy)] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[var(--rams-red)]">{t("contact")}</Link>
      </nav>

      <div className="flex items-center lg:hidden">
        <button type="button" aria-label={open ? a11y("closeMenu") : a11y("openMenu")} onClick={() => setOpen((value) => !value)}>
          <span className="sr-only">{a11y("menu")}</span>
          {/* Mobile menu icon */}
        </button>
      </div>
    </div>
  </header>;
}

