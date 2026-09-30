export const ALUMNI_PROGRAMS = [
  "S1 TEKNIK SISTEM PERKAPALAN",
  "S1 DOUBLE DEGREE (DD)",
  "S2 TEKNIK SISTEM PERKAPALAN",
  "S2 DOUBLE DEGREE (DD)",
  "S3 TEKNIK SISTEM PERKAPALAN",
  "S3 DOUBLE DEGREE (DD)",
] as const;

export type AlumniProgram = (typeof ALUMNI_PROGRAMS)[number];

// Programs pre-dating the approved list remain valid stored data, but they do
// not count as an alumni's one-time academic-program claim. The self-update
// schema still accepts only values from this list, so a legacy value can only
// be replaced by an approved program.
export function isApprovedAlumniProgram(
  value: unknown,
): value is AlumniProgram {
  return (
    typeof value === "string" &&
    (ALUMNI_PROGRAMS as readonly string[]).includes(value)
  );
}
