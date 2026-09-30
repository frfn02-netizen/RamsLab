import { describe, expect, it } from "vitest";
import {
  deriveAngkatanFromTahunAngkatan,
  isCohortYearInputConstrained,
} from "@/lib/alumni-angkatan-suggestion";

describe("deriveAngkatanFromTahunAngkatan", () => {
  it.each([
    [2005, 45],
    [2015, 55],
  ])("derives P%s from %s", (year, expectedP) => {
    expect(deriveAngkatanFromTahunAngkatan(year)).toBe(expectedP);
  });

  it("refuses a year that cannot produce the supported P range", () => {
    expect(deriveAngkatanFromTahunAngkatan(1960)).toBeUndefined();
    expect(deriveAngkatanFromTahunAngkatan(2060)).toBeUndefined();
    expect(deriveAngkatanFromTahunAngkatan("not-a-year")).toBeUndefined();
  });
});

describe("isCohortYearInputConstrained", () => {
  // An empty field constrains the *next* value the user types.
  it.each(["", "   "])("constrains an empty value %j", (value) => {
    expect(isCohortYearInputConstrained(value)).toBe(true);
  });

  it.each(["1961", "2015", "2059"])(
    "constrains the valid value %s",
    (value) => {
      expect(isCohortYearInputConstrained(value)).toBe(true);
    },
  );

  // A stored legacy year must never carry min/max: the browser would block
  // the whole form submit and the profile could not be saved at all.
  it.each(["1900", "1955", "1960", "2060", "2100", "2015.5", "abc"])(
    "leaves the legacy or invalid value %s unconstrained",
    (value) => {
      expect(isCohortYearInputConstrained(value)).toBe(false);
    },
  );
});
