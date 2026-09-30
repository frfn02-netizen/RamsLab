export function isSafeHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function isSafeLinkedInUrl(value: string): boolean {
  if (!isSafeHttpUrl(value)) return false;

  try {
    const hostname = new URL(value).hostname.toLowerCase();
    return (
      hostname === "linkedin.com" ||
      hostname.endsWith(".linkedin.com") ||
      hostname === "lnkd.in"
    );
  } catch {
    return false;
  }
}

export function safeHttpUrl(value?: string | null): string | undefined {
  if (!value || !isSafeHttpUrl(value)) return undefined;
  return value;
}

// Photo values written before the URL-first profile storage still use plain
// image filenames (e.g. `profile-1.jpg`), so those stay valid alongside full
// http(s) URLs. Anything else — javascript:, data:, vbscript:, empty or an
// arbitrary string — is refused.
const LEGACY_PHOTO_FILENAME = /^[a-zA-Z0-9_-]+\.(jpe?g|png|webp)$/;

export function isPhotoValue(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (isSafeHttpUrl(trimmed)) return true;
  return LEGACY_PHOTO_FILENAME.test(trimmed);
}
