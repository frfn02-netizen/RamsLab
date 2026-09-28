// Shared formatter for the public alumni cohort label.
//
// Pak Dhimas approved these exact shapes. `tahunAngkatan` (calendar year) and
// `angkatan` (batch/sequence number, displayed as P) are stored separately and
// there is no official year → P mapping, so they are only combined here:
//   - year + batch : "Class of 2015 (P55)"
//   - batch only   : "Class of P55"    (alumni saved before the year field)
//   - year only    : "Class of 2015"
//   - neither      : null — the caller renders no label at all

export interface AlumniClassLabelInput {
  angkatan?: number | null;
  tahunAngkatan?: number | null;
}

export function formatAlumniClassLabel(
  member: AlumniClassLabelInput | null | undefined,
  classOf: string,
): string | null {
  const batch = member?.angkatan || null;
  const year = member?.tahunAngkatan || null;

  if (!batch && !year) return null;
  if (batch && year) return `${classOf} ${year} (P${batch})`;
  if (year) return `${classOf} ${year}`;
  return `${classOf} P${batch}`;
}
