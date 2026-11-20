import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/providers/auth-providers";
import { ToastProvider } from "@/components/providers/toast-providers";
import { assetPath } from "@/lib/asset-path";
import AnalyticsGate from "@/components/analytics-gate";

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
    icon: assetPath("/assets/RamsLogoFIX.png"),
    apple: assetPath("/assets/RamsLogoFIX.png"),
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
        <AuthProvider>
          <ToastProvider>{children}</ToastProvider>
        </AuthProvider>

        <AnalyticsGate />
      </body>
    </html>
  );
}
