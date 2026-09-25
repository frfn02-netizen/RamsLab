import type { Alumni } from "./alumni.types.js";

// Single source of truth for "may this alumni profile be published".
//
// Every gate must use these helpers so the platform never ends up with two
// definitions of "complete":
// - `profileCompleted` (informational badge, recomputed on each write)
// - `PATCH /:id/review` approval validation (server-side publication gate)
// - `/api/public/alumni` list and detail responses
export const PUBLISH_REQUIRED_FIELDS = [
  "fullName",
  "program",
  "nim",
  "angkatan",
  "photo",
] as const;

export type PublishRequiredField = (typeof PUBLISH_REQUIRED_FIELDS)[number];

export const PUBLISH_FIELD_LABELS: Record<PublishRequiredField, string> = {
  fullName: "full name",
  program: "program",
  nim: "NIM",
  angkatan: "angkatan",
  photo: "photo",
};

export type PublishSource = Partial<Pick<Alumni, PublishRequiredField>> | null;

function isPresent(value: unknown): boolean {
  if (typeof value === "string") return value.trim().length > 0;
  return value !== undefined && value !== null;
}

export function getMissingPublishFields(
  profile: PublishSource,
): PublishRequiredField[] {
  if (!profile) return [...PUBLISH_REQUIRED_FIELDS];
  return PUBLISH_REQUIRED_FIELDS.filter((field) => !isPresent(profile[field]));
}

export function isProfileComplete(profile: PublishSource): boolean {
  return getMissingPublishFields(profile).length === 0;
}

export function formatMissingPublishFields(
  missing: PublishRequiredField[],
): string {
  return missing.map((field) => PUBLISH_FIELD_LABELS[field]).join(", ");
}
