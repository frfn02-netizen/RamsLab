const YOUTUBE_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;

const YOUTUBE_HOSTNAMES = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "music.youtube.com",
  "youtube-nocookie.com",
  "www.youtube-nocookie.com",
  "youtu.be",
  "www.youtu.be",
]);

/**
 * Extracts a YouTube video ID from watch, short, Shorts, and embed URLs.
 * Query parameters such as `si`, `list`, and `t` are ignored.
 */
export function extractYouTubeId(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return null;

  try {
    const hasProtocol = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed);
    const parsed = new URL(hasProtocol ? trimmed : `https://${trimmed}`);

    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }

    const hostname = parsed.hostname.toLowerCase();
    if (!YOUTUBE_HOSTNAMES.has(hostname)) return null;

    const pathParts = parsed.pathname.split("/").filter(Boolean);

    if (hostname === "youtu.be" || hostname === "www.youtu.be") {
      const id = pathParts[0];
      return id && YOUTUBE_ID_PATTERN.test(id) ? id : null;
    }

    if (pathParts[0] === "shorts" || pathParts[0] === "embed") {
      const id = pathParts[1];
      return id && YOUTUBE_ID_PATTERN.test(id) ? id : null;
    }

    const id = parsed.searchParams.get("v");
    return id && YOUTUBE_ID_PATTERN.test(id) ? id : null;
  } catch {
    return null;
  }
}

export function getYouTubeThumbnailUrl(
  videoId: string,
  quality: "maxres" | "hq" = "maxres",
): string {
  return `https://img.youtube.com/vi/${videoId}/${quality === "maxres" ? "maxresdefault" : "hqdefault"}.jpg`;
}

export function getYouTubeEmbedUrl(videoId: string): string {
  return `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0`;
}
