import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const basePath =
  process.env.NEXT_PUBLIC_BASE_PATH || process.env.BASE_PATH || "";

const nextConfig: NextConfig = {
  basePath,
  assetPrefix: basePath,

  // Keep lib/asset-path.ts in sync with basePath even when only the legacy
  // BASE_PATH variable is set.
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },

  images: {
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
    ],
  },

  rewrites: async () => ({
    beforeFiles: [
      { source: "/", destination: "/en" },
    ],
    afterFiles: [],
    fallback: [],
  }),

  experimental: {
    useTypeScriptCli: false,
  },
};

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

export default withNextIntl(nextConfig);