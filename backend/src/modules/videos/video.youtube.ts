const ALLOWED_HOSTNAMES = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "youtu.be",
]);

const VIDEO_ID_REGEX = /^[A-Za-z0-9_-]{11}$/;

export function extractYouTubeVideoId(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (!ALLOWED_HOSTNAMES.has(parsed.hostname.toLowerCase())) return null;

    if (parsed.hostname.toLowerCase() === "youtu.be") {
      const id = parsed.pathname.slice(1).split("/")[0];
      return VIDEO_ID_REGEX.test(id) ? id : null;
    }

    if (parsed.pathname.startsWith("/shorts/")) {
      const id = parsed.pathname.split("/shorts/")[1]?.split(/[?/]/)[0];
      return id && VIDEO_ID_REGEX.test(id) ? id : null;
    }

    if (parsed.pathname.startsWith("/embed/")) {
      const id = parsed.pathname.split("/embed/")[1]?.split(/[?/]/)[0];
      return id && VIDEO_ID_REGEX.test(id) ? id : null;
    }

    const v = parsed.searchParams.get("v");
    if (v && VIDEO_ID_REGEX.test(v)) return v;

    return null;
  } catch {
    return null;
  }
}

export function youtubeThumbnailUrl(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
}

export function youtubeFallbackThumbnailUrl(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}
