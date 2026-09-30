export function safeHttpUrl(value?: string | null) {
  if (!value) return null;

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:"
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

// Mirrors the backend photo validation: stored alumni photos are either a
// full http(s) URL or a legacy image filename. Everything else (javascript:,
// data:, vbscript:, empty, arbitrary strings) must never be used as a link.
const LEGACY_PHOTO_FILENAME = /^[a-zA-Z0-9_-]+\.(jpe?g|png|webp)$/;

export function isSafePhotoValue(value?: string | null): boolean {
  return safePhotoUrl(value) !== null;
}

export function safePhotoUrl(value?: string | null): string | null {
  if (!value) return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  const httpUrl = safeHttpUrl(trimmed);
  if (httpUrl) return httpUrl;

  return LEGACY_PHOTO_FILENAME.test(trimmed) ? trimmed : null;
}
