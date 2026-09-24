import type { Metadata } from "next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";
import { AuthProvider } from "@/components/providers/auth-providers";
import { assetPath } from "@/lib/asset-path";

export const metadata: Metadata = {
  title: {
    default: "RAMS Laboratory",
    template: "%s | RAMS Laboratory",
  },

  description:
    "Reliability, safety, and marine systems research at ITS Surabaya.",

  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  ),

  icons: {
    icon: assetPath("/assets/rams-logo.png"),
    apple: assetPath("/assets/rams-logo.png"),
  },

  robots: {
    index: true,
    follow: true,
  },

  openGraph: {
    type: "website",
    siteName: "RAMS Laboratory",
    title: "RAMS Laboratory",
    description:
      "Reliability, safety, and marine systems research at ITS Surabaya.",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  return (
    <html lang="en">
      <body>
        <AuthProvider>{children}</AuthProvider>

        <SpeedInsights />
      </body>
    </html>
  );
}
