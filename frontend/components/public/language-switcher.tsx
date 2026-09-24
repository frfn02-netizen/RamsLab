"use client";

import { useLocale } from "next-intl";
// import { usePathname } from "@/i18n/navigation";
import { useRamsLabRouter } from "./rams-lab-router";
import type { Locale } from "@/i18n/routing";

export default function LanguageSwitcher({ dark = false }: { dark?: boolean }) {
  const locale = useLocale() as Locale;
  // const pathname = usePathname();
  const router = useRamsLabRouter();

  function switchLocale(nextLocale: Locale) {
    const browserPath = window.location.pathname;

    const RAMS_LAB_PREFIX = "/rams-lab";

    let nextPath = browserPath;

    if (
      nextPath === RAMS_LAB_PREFIX ||
      nextPath.startsWith(`${RAMS_LAB_PREFIX}/`)
    ) {
      nextPath = nextPath.slice(RAMS_LAB_PREFIX.length) || "/";
    }

    if (nextPath === "/id" || nextPath.startsWith("/id/")) {
      nextPath = nextPath.slice(3) || "/";
    } else if (nextPath === "/en" || nextPath.startsWith("/en/")) {
      nextPath = nextPath.slice(3) || "/";
    }

    const query = window.location.search.slice(1);

    const href = query ? `${nextPath}?${query}` : nextPath;

    router.replace(href, { locale: nextLocale });
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
