import { describe, expect, it } from "vitest";
import {
  YEAR_TO_ANGKATAN,
  applyYearToAngkatanDraft,
  suggestAngkatanForYear,
} from "@/lib/alumni-angkatan-suggestion";
import { PUBLISH_REQUIRED_FIELDS } from "@/lib/alumni-publish";

// Reference data injected only in tests: there is still no official
// year → P mapping in the product itself.
const reference = { 2015: 55 };

describe("suggestAngkatanForYear", () => {
  it("ships an empty mapping, so no year → P formula is ever assumed", () => {
    expect(YEAR_TO_ANGKATAN).toEqual({});
    expect(suggestAngkatanForYear(2015)).toBeUndefined();
    expect(suggestAngkatanForYear("2015")).toBeUndefined();
  });

  it("only suggests a batch number for years present in the reference", () => {
    expect(suggestAngkatanForYear(2015, reference)).toBe(55);
    expect(suggestAngkatanForYear(2016, reference)).toBeUndefined();
  });

  it("rejects empty, non numeric and out of range years", () => {
    expect(suggestAngkatanForYear("", reference)).toBeUndefined();
    expect(suggestAngkatanForYear(null, reference)).toBeUndefined();
    expect(suggestAngkatanForYear(undefined, reference)).toBeUndefined();
    expect(suggestAngkatanForYear("abc", reference)).toBeUndefined();
    expect(suggestAngkatanForYear(1800, reference)).toBeUndefined();
    expect(suggestAngkatanForYear(2200, reference)).toBeUndefined();
  });

  it("ignores reference values outside the P range", () => {
    expect(suggestAngkatanForYear(2015, { 2015: 0 })).toBeUndefined();
    expect(suggestAngkatanForYear(2015, { 2015: 100 })).toBeUndefined();
    expect(suggestAngkatanForYear(2015, { 2015: 42.5 })).toBeUndefined();
  });
});

describe("applyYearToAngkatanDraft", () => {
  const empty = { stored: null, value: "", editedByUser: false };

  it("fills an empty, untouched P from the reference", () => {
    expect(applyYearToAngkatanDraft(empty, 2015, reference).value).toBe("55");
  });

  it("leaves P empty when the year has no reference entry", () => {
    expect(applyYearToAngkatanDraft(empty, 2016, reference).value).toBe("");
    // Default (empty) mapping: the alumni always fills P themselves.
    expect(applyYearToAngkatanDraft(empty, 2015).value).toBe("");
  });

  it("never overwrites a P that is already stored", () => {
    const draft = applyYearToAngkatanDraft(
      { stored: 34, value: "34", editedByUser: false },
      2015,
      reference,
    );
    expect(draft.value).toBe("34");
  });

  it("never overwrites a P the user has typed", () => {
    const draft = applyYearToAngkatanDraft(
      { stored: null, value: "42", editedByUser: true },
      2015,
      reference,
    );
    expect(draft.value).toBe("42");
  });

  it("clears a suggestion when the year is removed", () => {
    const filled = applyYearToAngkatanDraft(empty, 2015, reference);
    expect(filled.value).toBe("55");

    expect(applyYearToAngkatanDraft(filled, "", reference).value).toBe("");
    expect(applyYearToAngkatanDraft(filled, null, reference).value).toBe("");
  });

  it("keeps a user typed P when the year is removed", () => {
    const typed = { stored: null, value: "42", editedByUser: true };
    expect(applyYearToAngkatanDraft(typed, "", reference).value).toBe("42");
  });

  it("keeps a stored P when the year is removed", () => {
    const stored = { stored: 34, value: "34", editedByUser: false };
    expect(applyYearToAngkatanDraft(stored, "", reference).value).toBe("34");
  });

  it("re-suggests for the new year while P is still untouched", () => {
    const filled = applyYearToAngkatanDraft(empty, 2015, reference);
    const retyped = applyYearToAngkatanDraft(
      { ...filled, stored: 55 },
      2016,
      { ...reference, 2016: 56 },
    );
    expect(retyped.value).toBe("55");
  });
});

describe("publication requirements", () => {
  it("does not require the cohort year to publish a profile", () => {
    expect(PUBLISH_REQUIRED_FIELDS).not.toContain("tahunAngkatan");
    // The batch number stays required, unchanged.
    expect(PUBLISH_REQUIRED_FIELDS).toContain("angkatan");
  });
});
