import type { Alumni } from "./alumni.types.js";

// Single source of truth for "which publish fields are still missing".
//
// Informational only: publication follows `reviewStatus` + `isPublic`, so an
// approved profile is never hidden or refused because a field is empty
// (product decision by Pak Dhimas). These helpers still drive:
// - `profileCompleted`, the recomputed informational flag written on each save
// - the "missing fields" hints shown in the admin and alumni UI
//
// Keep the frontend copy (frontend/lib/alumni-publish.ts) identical.
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
