import { describe, expect, it } from "vitest";
import type { Request } from "express";
import { ObjectId } from "mongodb";

import {
  updateAlumniSchema,
  updateMyAlumniSchema,
} from "../src/modules/alumni/alumni.schema.js";
import { deriveAngkatanFromTahunAngkatan } from "../src/modules/alumni/alumni.service.js";
import { ALUMNI_PROGRAMS } from "../src/modules/alumni/alumni-program.js";
import { PUBLISH_REQUIRED_FIELDS } from "../src/modules/alumni/alumni-completeness.js";
import { toPublicAlumniProfile } from "../src/modules/public/public-profile.js";
import type { Alumni } from "../src/modules/alumni/alumni.types.js";

// These tests need no database: they pin the contract of the new
// `tahunAngkatan` field (schema parsing, public serialisation) so a missing
// local mongod cannot hide a regression.

describe("tahunAngkatan schema contract", () => {
  it("accepts a valid year in both the alumni and the admin schema", () => {
    expect(updateMyAlumniSchema.parse({ tahunAngkatan: 2015 })).toMatchObject({
      tahunAngkatan: 2015,
    });
    expect(updateAlumniSchema.parse({ tahunAngkatan: 1961 })).toMatchObject({
      tahunAngkatan: 1961,
    });
    expect(updateAlumniSchema.parse({ tahunAngkatan: 2059 })).toMatchObject({
      tahunAngkatan: 2059,
    });
  });

  it("preserves null so a cleared year is actually persisted", () => {
    expect(updateMyAlumniSchema.parse({ tahunAngkatan: null })).toMatchObject({
      tahunAngkatan: null,
    });
    expect(updateAlumniSchema.parse({ tahunAngkatan: null })).toMatchObject({
      tahunAngkatan: null,
    });
  });

  it("treats an omitted year as untouched", () => {
    expect(updateMyAlumniSchema.parse({})).not.toHaveProperty("tahunAngkatan");
    expect(updateAlumniSchema.parse({})).not.toHaveProperty("tahunAngkatan");
  });

  it("keeps the historical 1900..2100 window so legacy years stay savable", () => {
    // The schema only guards the acceptance window. Rejecting a changed
    // out-of-range year is the service's job (alumni.test.ts), so a record
    // stored under the old contract can still be re-saved unchanged.
    for (const schema of [updateMyAlumniSchema, updateAlumniSchema]) {
      expect(schema.safeParse({ tahunAngkatan: 1900 }).success).toBe(true);
      expect(schema.safeParse({ tahunAngkatan: 1960 }).success).toBe(true);
      expect(schema.safeParse({ tahunAngkatan: 2060 }).success).toBe(true);
      expect(schema.safeParse({ tahunAngkatan: 2100 }).success).toBe(true);
    }
  });

  it("rejects non integer years and values outside the legacy window", () => {
    expect(
      updateMyAlumniSchema.safeParse({ tahunAngkatan: 1899 }).success,
    ).toBe(false);
    expect(
      updateMyAlumniSchema.safeParse({ tahunAngkatan: 2101 }).success,
    ).toBe(false);
    expect(
      updateMyAlumniSchema.safeParse({ tahunAngkatan: 2015.5 }).success,
    ).toBe(false);
    expect(
      updateMyAlumniSchema.safeParse({ tahunAngkatan: "2015" }).success,
    ).toBe(false);
    expect(
      updateAlumniSchema.safeParse({ tahunAngkatan: 2101 }).success,
    ).toBe(false);
  });

  it("keeps the batch number range unchanged", () => {
    expect(updateMyAlumniSchema.parse({ angkatan: 1 })).toMatchObject({
      angkatan: 1,
    });
    expect(updateMyAlumniSchema.safeParse({ angkatan: 0 }).success).toBe(false);
    expect(updateMyAlumniSchema.safeParse({ angkatan: 100 }).success).toBe(
      false,
    );
  });

  it("does not require the cohort year for publication", () => {
    expect(PUBLISH_REQUIRED_FIELDS).not.toContain("tahunAngkatan");
    expect(PUBLISH_REQUIRED_FIELDS).toContain("angkatan");
  });
});

describe("P derivation", () => {
  it.each([
    [2005, 45],
    [2015, 55],
    [1961, 1],
    [2059, 99],
  ])("derives P%s from Tahun Angkatan %s", (tahunAngkatan, expectedP) => {
    expect(deriveAngkatanFromTahunAngkatan(tahunAngkatan)).toBe(expectedP);
  });

  // No P can be derived outside 1961..2059: the value would fall outside the
  // persisted 1..99 range. The service then leaves the stored P untouched
  // instead of writing `null` over it.
  it.each([1900, 1960, 2060, 2100])(
    "derives no P for the legacy year %s",
    (tahunAngkatan) => {
      expect(deriveAngkatanFromTahunAngkatan(tahunAngkatan)).toBeUndefined();
    },
  );
});

describe("alumni program schema contract", () => {
  it.each(ALUMNI_PROGRAMS)("accepts the exact program %s", (program) => {
    expect(updateMyAlumniSchema.parse({ program })).toMatchObject({ program });
    expect(updateAlumniSchema.parse({ program })).toMatchObject({ program });
  });

  it("rejects arbitrary program values", () => {
    expect(
      updateMyAlumniSchema.safeParse({ program: "Naval Architecture" }).success,
    ).toBe(false);
    expect(
      updateAlumniSchema.safeParse({ program: "S1 Teknik Sistem Perkapalan" }).success,
    ).toBe(false);
  });
});

describe("toPublicAlumniProfile – additive cohort year", () => {
  function member(overrides: Partial<Alumni> = {}): Alumni {
    return {
      _id: new ObjectId("000000000000000000000001"),
      userId: new ObjectId("000000000000000000000002"),
      fullName: "Public Alumni",
      nim: "PRIVATE-NIM",
      angkatan: 55,
      program: "Marine Engineering",
      currentStatus: "WORKING",
      careerHistory: [],
      educationHistory: [],
      isPublic: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    } as unknown as Alumni;
  }

  it("returns the cohort year together with the batch number", () => {
    const profile = toPublicAlumniProfile(
      {} as Request,
      member({ tahunAngkatan: 2015 }),
    );

    expect(profile.angkatan).toBe(55);
    expect(profile.tahunAngkatan).toBe(2015);
  });

  it("returns the batch number alone for alumni saved without a year", () => {
    const profile = toPublicAlumniProfile({} as Request, member());

    expect(profile.angkatan).toBe(55);
    expect(profile.tahunAngkatan).toBeUndefined();
  });

  it("resolves a safe non-UUID legacy photo filename through uploads", () => {
    const profile = toPublicAlumniProfile(
      { get: () => undefined, protocol: "http" } as Request,
      member({ photo: "alumni-photo_1.jpg" }),
    );

    expect(profile.photo).toBe(
      "http://localhost:5000/uploads/dosen/alumni-photo_1.jpg",
    );
  });

  it("never reintroduces the retired graduationYear field", () => {
    const profile = toPublicAlumniProfile(
      {} as Request,
      member({ tahunAngkatan: 2015 }),
    );

    expect(profile).not.toHaveProperty("graduationYear");
    expect(Object.keys(profile)).not.toContain("graduationYear");
  });
});
