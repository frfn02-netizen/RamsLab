// Mirror of backend/src/modules/alumni/alumni-completeness.ts.
//
// The backend stays the source of truth: approval and the public endpoints
// validate these fields server-side. This copy only tells admins and alumni
// *which* fields are still missing, so keep both lists identical.
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

export type PublishSource =
  | Partial<Pick<Record<string, unknown>, PublishRequiredField>>
  | null
  | undefined;

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

export function formatMissingPublishFields(
  missing: PublishRequiredField[],
): string {
  return missing.map((field) => PUBLISH_FIELD_LABELS[field]).join(", ");
}
