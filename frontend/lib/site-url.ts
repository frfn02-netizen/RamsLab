const LOCAL_SITE_URL = "http://localhost:3000";
const PUBLIC_SITE_URL = "https://rams.co.id";
const PRODUCTION_BUILD_PHASE = "phase-production-build";

export function getSiteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();

  if (configured) {
    return configured.replace(/\/+$/, "");
  }

  if (process.env.NODE_ENV === "production") {
    // `next build` runs with NODE_ENV=production before deployment env vars are
    // available. Use the known public origin so prerendered canonical URLs never
    // fall back to localhost, while a production server still fails loudly.
    if (process.env.NEXT_PHASE === PRODUCTION_BUILD_PHASE) {
      return PUBLIC_SITE_URL;
    }

    throw new Error(
      "NEXT_PUBLIC_SITE_URL is required in production. Set it to the public site origin, for example https://rams.co.id.",
    );
  }

  return LOCAL_SITE_URL;
}
