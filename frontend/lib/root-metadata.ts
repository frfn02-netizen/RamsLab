import type { Metadata } from "next";

import { assetPath } from "./asset-path";
import { getSiteUrl } from "./site-url";

const SITE_DESCRIPTION =
  "Reliability, safety, and marine systems research at ITS Surabaya.";

export const rootMetadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: "RAMS Laboratory",
    template: "%s | RAMS Laboratory",
  },
  description: SITE_DESCRIPTION,
  alternates: {
    canonical: "/",
  },
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
    description: SITE_DESCRIPTION,
    url: "/",
    images: [
      {
        url: assetPath("/assets/RamsLogoFIX.png"),
        alt: "RAMS Laboratory",
      },
    ],
  },
};
