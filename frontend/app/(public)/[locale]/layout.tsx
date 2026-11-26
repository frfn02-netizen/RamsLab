import { notFound } from "next/navigation";
import {
  getMessages,
  getTranslations,
  setRequestLocale,
} from "next-intl/server";
import { NextIntlClientProvider } from "next-intl";

import "../../globals.css";

import PublicFooter from "@/components/public/public-footer";
import PublicHeader from "@/components/public/public-header";
import { HeroProvider } from "@/components/public/hero-context";
import { RootProviders } from "@/components/providers/root-providers";
import { routing, type Locale } from "@/i18n/routing";
import { getPublicFooterContent } from "@/lib/public/server-data";

export const revalidate = 300;

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

  if (!routing.locales.includes(locale as Locale)) {
    notFound();
  }

  const resolvedLocale = locale as Locale;

  setRequestLocale(resolvedLocale);

  const [messages, t, footerContent] = await Promise.all([
    getMessages(),
    getTranslations("a11y"),
    getPublicFooterContent(),
  ]);

  return (
    <html lang={resolvedLocale}>
      <body>
        <RootProviders>
          <NextIntlClientProvider locale={resolvedLocale} messages={messages}>
            <div className="public-site min-h-screen bg-[var(--paper)]">
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

                <PublicFooter content={footerContent} />
              </HeroProvider>
            </div>
          </NextIntlClientProvider>
        </RootProviders>
      </body>
    </html>
  );
}
