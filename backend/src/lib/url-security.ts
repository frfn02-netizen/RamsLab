export function isSafeHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function safeHttpUrl(value?: string | null): string | undefined {
  if (!value || !isSafeHttpUrl(value)) return undefined;
  return value;
}
