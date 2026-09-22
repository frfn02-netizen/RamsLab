import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const basePath = process.env.BASE_PATH || "";

const nextConfig: NextConfig = {
  basePath,
  assetPrefix: basePath,

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