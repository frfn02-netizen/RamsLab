import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  experimental: {
    // TypeScript 5.9 is supported by Next's compiler API; the experimental
    // CLI checker currently emits unparsable config output in this toolchain.
    useTypeScriptCli: false,
  },
};

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

export default withNextIntl(nextConfig);
