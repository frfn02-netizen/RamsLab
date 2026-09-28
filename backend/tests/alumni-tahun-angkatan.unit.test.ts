import { describe, expect, it } from "vitest";
import type { Request } from "express";
import { ObjectId } from "mongodb";

import {
  updateAlumniSchema,
  updateMyAlumniSchema,
} from "../src/modules/alumni/alumni.schema.js";
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
    expect(updateAlumniSchema.parse({ tahunAngkatan: 1900 })).toMatchObject({
      tahunAngkatan: 1900,
    });
    expect(updateAlumniSchema.parse({ tahunAngkatan: 2100 })).toMatchObject({
      tahunAngkatan: 2100,
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
    expect(updateMyAlumniSchema.parse({})).not.toHaveProperty(
      "tahunAngkatan",
    );
    expect(updateAlumniSchema.parse({})).not.toHaveProperty("tahunAngkatan");
  });

  it("rejects out of range and non integer years", () => {
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
    const profile = toPublicAlumniProfile({} as Request, member({ tahunAngkatan: 2015 }));

    expect(profile.angkatan).toBe(55);
    expect(profile.tahunAngkatan).toBe(2015);
  });

  it("returns the batch number alone for alumni saved without a year", () => {
    const profile = toPublicAlumniProfile({} as Request, member());

    expect(profile.angkatan).toBe(55);
    expect(profile.tahunAngkatan).toBeUndefined();
  });

  it("never reintroduces the retired graduationYear field", () => {
    const profile = toPublicAlumniProfile({} as Request, member({ tahunAngkatan: 2015 }));

    expect(profile).not.toHaveProperty("graduationYear");
    expect(Object.keys(profile)).not.toContain("graduationYear");
  });
});
