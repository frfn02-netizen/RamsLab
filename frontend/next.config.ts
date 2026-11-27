import path from "node:path";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const basePath =
  process.env.NEXT_PUBLIC_BASE_PATH || process.env.BASE_PATH || "";
// Env vars are always strings; Next.js requires real booleans for these options.
const trailingSlashValue =
  (process.env.TRAILING_SLASH_CONFIG ?? process.env.TRALING_SLASH_CONFIG) ===
  "true";
const unoptimizedValue = process.env.UNOPTIMIZED_IMG_CONFIG === "true";

type RemotePattern = {
  protocol: "http" | "https";
  hostname: string;
  port?: string;
  pathname: string;
};

function apiRemotePatterns(): RemotePattern[] {
  const candidates = [
    process.env.NEXT_PUBLIC_API_URL,
    process.env.INTERNAL_API_URL,
  ].filter((value): value is string => Boolean(value?.trim()));

  const patterns: RemotePattern[] = [];

  for (const candidate of candidates) {
    try {
      const url = new URL(candidate);
      if (url.protocol !== "http:" && url.protocol !== "https:") continue;
      patterns.push({
        protocol: url.protocol === "https:" ? "https" : "http",
        hostname: url.hostname,
        ...(url.port ? { port: url.port } : {}),
        pathname: "/**",
      });
    } catch {
      // Invalid env values are reported by the API client and build checks.
    }
  }

  return patterns;
}

const nextConfig: NextConfig = {
  basePath,
  assetPrefix: basePath,
  outputFileTracingRoot: path.resolve(process.cwd()),

  // Keep lib/asset-path.ts in sync with basePath even when only the legacy
  // BASE_PATH variable is set.
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
  trailingSlash: trailingSlashValue,

  async redirects() {
    return [
      {
        source: "/schedule",
        destination: "/meetings",
        permanent: true,
      },
      {
        source: "/:locale/schedule",
        destination: "/:locale/meetings",
        permanent: true,
      },
      {
        source: "/meetings",
        destination: "/dashboard/meetings",
        permanent: true,
      },
      {
        source: "/meetings/:path*",
        destination: "/dashboard/meetings/:path*",
        permanent: true,
      },
      {
        source: "/en/meetings",
        destination: "/dashboard/meetings",
        permanent: true,
      },
      {
        source: "/en/meetings/:path*",
        destination: "/dashboard/meetings/:path*",
        permanent: true,
      },
      {
        source: "/id/meetings",
        destination: "/dashboard/meetings",
        permanent: true,
      },
      {
        source: "/id/meetings/:path*",
        destination: "/dashboard/meetings/:path*",
        permanent: true,
      },
    ];
  },

  images: {
    unoptimized: unoptimizedValue,

    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/**",
      },
      {
        protocol: "http",
        hostname: "localhost",
        port: "5000",
        pathname: "/uploads/**",
      },
      {
        protocol: "http",
        hostname: "127.0.0.1",
        port: "5000",
        pathname: "/uploads/**",
      },
      ...apiRemotePatterns(),
    ],
  },

  rewrites: async () => ({
    beforeFiles: [{ source: "/", destination: "/en" }],
    afterFiles: [],
    fallback: [],
  }),

  experimental: {
    useTypeScriptCli: false,
  },
};

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

export default withNextIntl(nextConfig);
