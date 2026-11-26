export function deriveAngkatanFromTahunAngkatan(
  tahunAngkatan: string | number | null | undefined,
): number | undefined {
  if (tahunAngkatan === null || tahunAngkatan === undefined) return undefined;

  const year = Number(tahunAngkatan);
  if (!Number.isInteger(year) || year < 1961 || year > 2059) return undefined;
  return year - 1960;
}

export function isCohortYearInputConstrained(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed === "") return true;
  const year = Number(trimmed);
  return Number.isInteger(year) && year >= 1961 && year <= 2059;
}
