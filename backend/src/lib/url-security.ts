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
