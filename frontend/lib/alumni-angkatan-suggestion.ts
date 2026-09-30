// P is a compatibility field, not a user-entered value. Pak Dhimas defined it
// as the cohort year minus 1960. Backend validation remains authoritative;
// this helper only lets UI formatters and focused tests use the same rule.
export function deriveAngkatanFromTahunAngkatan(
  tahunAngkatan: string | number | null | undefined,
): number | undefined {
  if (tahunAngkatan === null || tahunAngkatan === undefined) return undefined;
  const year = Number(tahunAngkatan);
  if (!Number.isInteger(year) || year < 1961 || year > 2059) return undefined;
  return year - 1960;
}

// `min`/`max` on a number input make the browser block the whole form submit
// whenever the displayed value is out of range. A record stored under the
// older 1900..2100 contract would become unsavable, so the bounds are applied
// only while the value is empty or already inside the derivable window: a
// legacy value stays submittable and the service is what rejects a genuinely
// new out-of-range year (and never rewrites a stored one).
export function isCohortYearInputConstrained(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed === "") return true;
  const year = Number(trimmed);
  return Number.isInteger(year) && year >= 1961 && year <= 2059;
}
