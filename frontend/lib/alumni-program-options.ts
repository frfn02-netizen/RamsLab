// Keep this list identical to backend/src/modules/alumni/alumni-program.ts.
// The applications are independently compiled, so importing backend source
// here would break the frontend build boundary.
export const ALUMNI_PROGRAM_OPTIONS = [
  "S1 TEKNIK SISTEM PERKAPALAN",
  "S1 DOUBLE DEGREE (DD)",
  "S2 TEKNIK SISTEM PERKAPALAN",
  "S2 DOUBLE DEGREE (DD)",
  "S3 TEKNIK SISTEM PERKAPALAN",
  "S3 DOUBLE DEGREE (DD)",
] as const;

export function isAlumniProgram(value: string): boolean {
  return (ALUMNI_PROGRAM_OPTIONS as readonly string[]).includes(value);
}
