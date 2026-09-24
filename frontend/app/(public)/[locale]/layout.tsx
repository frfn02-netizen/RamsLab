import { notFound } from "next/navigation";
import {
  getMessages,
  getTranslations,
  setRequestLocale,
} from "next-intl/server";
import { NextIntlClientProvider } from "next-intl";
import PublicFooter from "@/components/public/public-footer";
import PublicHeader from "@/components/public/public-header";
import { HeroProvider } from "@/components/public/hero-context";
import { routing, type Locale } from "@/i18n/routing";
import { headers } from "next/headers";
import { RamsLabNavigationProvider } from "@/components/public/rams-lab-navigation-provider";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const requestHeaders = await headers();
  const isRamsLab = requestHeaders.get("x-rams-lab") === "1";

  if (!routing.locales.includes(locale as Locale)) {
    notFound();
  }

  const resolvedLocale = locale as Locale;

  setRequestLocale(resolvedLocale);

  const [messages, t] = await Promise.all([
    getMessages(),
    getTranslations("a11y"),
  ]);

  return (
    <NextIntlClientProvider locale={resolvedLocale} messages={messages}>
      <RamsLabNavigationProvider enabled={isRamsLab}>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:bg-white focus:px-4 focus:py-3 focus:text-sm focus:text-[var(--navy)]"
        >
          {t("skipToContent")}
        </a>

        <HeroProvider>
          <PublicHeader />

          <main id="main-content" className="pt-[4.5rem]">
            {children}
          </main>

          <PublicFooter />
        </HeroProvider>
      </RamsLabNavigationProvider>
    </NextIntlClientProvider>
  );
}
