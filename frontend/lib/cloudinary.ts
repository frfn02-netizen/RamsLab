/**
 * Cloudinary URL optimization utilities.
 *
 * Cloudinary URLs follow the pattern:
 *   https://res.cloudinary.com/<cloud>/image/upload/<transformations>/<version>/<public_id>.<format>
 *
 * We can insert transformation parameters after `/image/upload/` to apply
 * automatic format selection, quality compression, and width constraints.
 */

const CLOUDINARY_UPLOAD_MARKER = "/image/upload/";

/**
 * Returns true if the URL points to a Cloudinary image.
 */
export function isCloudinaryUrl(url: string): boolean {
  return url.includes("res.cloudinary.com/") && url.includes(CLOUDINARY_UPLOAD_MARKER);
}

export interface CloudinaryTransformOptions {
  /** Maximum width in pixels. Cloudinary will resize proportionally. */
  width?: number;
  /** Auto format conversion (f_auto). Converts to WebP/AVIF when supported. */
  autoFormat?: boolean;
  /** Auto quality compression (q_auto). Optimizes quality vs file size. */
  autoQuality?: boolean;
  /** Device pixel ratio auto (dpr_auto). Serves higher res for Retina displays. */
  dpr?: boolean;
}

/**
 * Appends Cloudinary transformation parameters to a Cloudinary URL.
 *
 * Transformations are inserted after `/image/upload/` and before any existing
 * transformations or version path. This is safe for all existing URLs because
 * Cloudinary applies transformations left-to-right.
 *
 * @example
 *   optimizeCloudinaryUrl("https://res.cloudinary.com/demo/image/upload/v1/photo.jpg")
 *   // => "https://res.cloudinary.com/demo/image/upload/f_auto,q_auto/v1/photo.jpg"
 *
 * @example
 *   optimizeCloudinaryUrl(url, { width: 400 })
 *   // => "https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,w_400/v1/photo.jpg"
 */
export function optimizeCloudinaryUrl(
  url: string,
  options: CloudinaryTransformOptions = {},
): string {
  if (!isCloudinaryUrl(url)) return url;

  const { width, autoFormat = true, autoQuality = true, dpr = false } = options;

  const parts: string[] = [];
  if (autoFormat) parts.push("f_auto");
  if (autoQuality) parts.push("q_auto");
  if (dpr) parts.push("dpr_auto");
  if (width) parts.push(`w_${width}`);

  if (parts.length === 0) return url;

  const markerIndex = url.indexOf(CLOUDINARY_UPLOAD_MARKER);
  const insertAt = markerIndex + CLOUDINARY_UPLOAD_MARKER.length;

  return url.slice(0, insertAt) + parts.join(",") + "," + url.slice(insertAt);
}
