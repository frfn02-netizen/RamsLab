// Safe default (suggestion) for the batch number field, `angkatan` (P).
//
// Requirement from Pak Dhimas: there is NO official year → P mapping, so the
// app must never invent a formula. The table stays empty until a verified
// reference is supplied — while it is empty the suggestion is `undefined` and
// the alumni simply fills P in themselves.
//
// A suggestion may only ever:
//   - fill P while it is empty AND untouched by the user, and
//   - be cleared again if the year is removed and P still comes from it.
// It must never overwrite a saved P or a P the user has typed.

export type YearToAngkatanMapping = Readonly<Record<number, number>>;

// Reserved for verified reference data only. Do not derive values here.
export const YEAR_TO_ANGKATAN: YearToAngkatanMapping = {};

export function suggestAngkatanForYear(
  tahunAngkatan: string | number | null | undefined,
  mapping: YearToAngkatanMapping = YEAR_TO_ANGKATAN,
): number | undefined {
  if (tahunAngkatan === null || tahunAngkatan === undefined) return undefined;
  const year = Number(tahunAngkatan);
  if (!Number.isInteger(year) || year < 1900 || year > 2100) return undefined;
  const batch = mapping[year];
  if (!Number.isInteger(batch) || batch < 1 || batch > 99) return undefined;
  return batch;
}

export interface AngkatanDraft {
  /** P already persisted on the server (null for a profile saved without P). */
  stored: number | null;
  /** Current value of the P input. */
  value: string;
  /** True once the alumni has typed in the P input. */
  editedByUser: boolean;
}

/**
 * Recomputes the P input after the year field changes.
 *
 * Returns the draft unchanged when P is already stored or has been edited by
 * the user; otherwise it writes the suggestion (or clears P when the mapping
 * has no entry for the new year).
 */
export function applyYearToAngkatanDraft(
  draft: AngkatanDraft,
  tahunAngkatan: string | number | null | undefined,
  mapping: YearToAngkatanMapping = YEAR_TO_ANGKATAN,
): AngkatanDraft {
  if (draft.stored || draft.editedByUser) return draft;

  const suggested = suggestAngkatanForYear(tahunAngkatan, mapping);
  return {
    ...draft,
    value: suggested === undefined ? "" : String(suggested),
  };
}
