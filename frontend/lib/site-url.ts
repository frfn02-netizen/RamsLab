const LOCAL_SITE_URL = "http://localhost:3000";

export function getSiteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();

  if (configured) {
    return configured.replace(/\/+$/, "");
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "NEXT_PUBLIC_SITE_URL is required in production. Set it to the public site origin, for example https://rams.co.id.",
    );
  }

  return LOCAL_SITE_URL;
}
