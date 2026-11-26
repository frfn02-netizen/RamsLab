import type { MetadataRoute } from "next";

import { getSiteUrl } from "@/lib/site-url";

const PUBLIC_PATHS = [
  "/about",
  "/research",
  "/publications",
  "/events",
  "/public-service",
  "/partners",
  "/team",
  "/alumni",
  "/videos",
  "/contact",
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = getSiteUrl();
  const urls = [
    `${siteUrl}/`,
    `${siteUrl}/id`,
    ...PUBLIC_PATHS.map((path) => `${siteUrl}${path}`),
    ...PUBLIC_PATHS.map((path) => `${siteUrl}/id${path}`),
  ];

  return Array.from(new Set(urls)).map((url) => ({ url }));
}
