"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

export default function LanguageSwitcher({ dark = false }: { dark?: boolean }) {
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const router = useRouter();

  function switchLocale(nextLocale: Locale) {
    const query = window.location.search.slice(1);
    const nextPath = query ? `${pathname}?${query}` : pathname;
    router.replace(nextPath, { locale: nextLocale });
  }

  return (
    <div className="flex items-center text-xs font-semibold">
      <button
        type="button"
        onClick={() => switchLocale("en")}
        className={`px-1 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--rams-red)] ${locale === "en" ? "text-[var(--rams-red)]" : dark ? "text-white/70 hover:text-white" : "text-[var(--charcoal)] hover:text-[var(--rams-red)]"}`}
      >
        EN
      </button>
      <span className={dark ? "text-white/35" : "text-[var(--border)]"}>/</span>
      <button
        type="button"
        onClick={() => switchLocale("id")}
        className={`px-1 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--rams-red)] ${locale === "id" ? "text-[var(--rams-red)]" : dark ? "text-white/70 hover:text-white" : "text-[var(--charcoal)] hover:text-[var(--rams-red)]"}`}
      >
        ID
      </button>
    </div>
  );
}
