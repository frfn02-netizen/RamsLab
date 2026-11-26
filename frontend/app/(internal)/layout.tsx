import type { ReactNode } from "react";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";

import "../globals.css";

import { RootProviders } from "@/components/providers/root-providers";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function InternalRootLayout({
  children,
}: {
  children: ReactNode;
}) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <body>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <RootProviders>{children}</RootProviders>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
