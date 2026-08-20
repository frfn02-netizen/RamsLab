import type { Metadata } from "next";
import { headers } from "next/headers";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";
import { AuthProvider } from "@/components/providers/auth-providers";

export const metadata: Metadata = {
  title: { default: "RAMS Laboratory", template: "%s | RAMS Laboratory" },
  description: "Reliability, safety, and marine systems research at ITS Surabaya.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    siteName: "RAMS Laboratory",
    title: "RAMS Laboratory",
    description: "Reliability, safety, and marine systems research at ITS Surabaya.",
  },
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const locale = (await headers()).get("x-rams-locale") === "id" ? "id" : "en";
  return (
    <html lang={locale}>
      <body>
        <AuthProvider>{children}</AuthProvider>
        <SpeedInsights/>
      </body>
    </html>
  );
}
