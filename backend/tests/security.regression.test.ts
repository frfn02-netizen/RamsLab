import { describe, expect, it } from "vitest";
import { ObjectId } from "mongodb";
import { createAdminAlumniSchema } from "../src/modules/alumni/admin-alumni.schema.js";
import {
  createAlumniSchema,
  updateAlumniSchema,
  updateMyAlumniSchema,
} from "../src/modules/alumni/alumni.schema.js";
import { createDosenSchema, updateDosenSchema } from "../src/modules/dosen/dosen.schema.js";
import { createStudentSchema, updateStudentSchema } from "../src/modules/students/student.schema.js";
import { toPublicAlumniProfile } from "../src/modules/public/public-profile.js";

const maliciousUrl = "javascript:alert(1)";

describe("security regressions", () => {
  it.each([
    ["dosen create", createDosenSchema, { userId: "000000000000000000000001", fullName: "Test Dosen", specialization: [], linkedin: maliciousUrl }],
    ["dosen update", updateDosenSchema, { linkedin: maliciousUrl }],
    ["student create", createStudentSchema, { fullName: "Test Student", studentType: "PHD_STUDENT", linkedin: maliciousUrl }],
    ["student update", updateStudentSchema, { linkedin: maliciousUrl }],
    ["alumni create", createAlumniSchema, { userId: "000000000000000000000001", fullName: "Test Alumni", nim: "TEST", graduationYear: 2020, program: "Test", currentStatus: "WORKING", careerHistory: [], educationHistory: [], linkedin: maliciousUrl }],
    ["admin alumni create", createAdminAlumniSchema, { email: "test@example.local", password: "a-secure-test-password", fullName: "Test Alumni", nim: "TEST", graduationYear: 2020, program: "Test", currentStatus: "WORKING", linkedin: maliciousUrl }],
    ["alumni update", updateAlumniSchema, { linkedin: maliciousUrl }],
    ["alumni self update", updateMyAlumniSchema, { linkedin: maliciousUrl }],
  ])("rejects dangerous LinkedIn URLs in %s", (_name, schema, input) => {
    expect(schema.safeParse(input).success).toBe(false);
  });

  it("does not expose Alumni NIM, location, or user fields publicly", () => {
    const profile = toPublicAlumniProfile({} as never, {
      _id: new ObjectId("000000000000000000000001"),
      userId: new ObjectId("000000000000000000000002"),
      fullName: "Public Alumni",
      nim: "PRIVATE-NIM",
      location: "Private Location",
      graduationYear: 2020,
      program: "Marine Engineering",
      currentStatus: "WORKING",
      currentCompany: "RAMS",
      currentPosition: "Engineer",
      phone: "+62000000000",
      bio: "Public biography",
      careerHistory: [],
      educationHistory: [],
      isPublic: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    expect(profile).not.toHaveProperty("nim");
    expect(profile).not.toHaveProperty("location");
    expect(profile).not.toHaveProperty("userId");
    expect(profile).not.toHaveProperty("phone");
    expect(profile).toMatchObject({ fullName: "Public Alumni", graduationYear: 2020 });
  });
});
