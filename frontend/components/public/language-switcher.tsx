"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import type { Locale } from "@/i18n/routing";

export default function LanguageSwitcher() {
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const query = searchParams.toString();

  function switchLocale(nextLocale: Locale) {
    const nextPath = query ? `${pathname}?${query}` : pathname;
    router.replace(nextPath, { locale: nextLocale });
  }

  return (
    <div className="flex items-center text-xs font-semibold">
      <button
        type="button"
        onClick={() => switchLocale("en")}
        className={`px-1 ${locale === "en" ? "text-[var(--rams-red)]" : "text-[var(--charcoal)]"}`}
      >
        EN
      </button>
      <span className="text-[var(--border)]">/</span>
      <button
        type="button"
        onClick={() => switchLocale("id")}
        className={`px-1 ${locale === "id" ? "text-[var(--rams-red)]" : "text-[var(--charcoal)]"}`}
      >
        ID
      </button>
    </div>
  );
}
