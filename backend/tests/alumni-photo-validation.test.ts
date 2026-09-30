import { afterAll, beforeAll, describe, expect, it } from "vitest";

import request from "supertest";
import { ObjectId } from "mongodb";

import app from "../src/app.js";

import { connectDatabase } from "../src/config/database.js";

import { isPhotoValue } from "../src/lib/url-security.js";
import {
  updateAlumniSchema,
  updateMyAlumniSchema,
} from "../src/modules/alumni/alumni.schema.js";
import { getAlumniCollection } from "../src/modules/alumni/alumni.repository.js";

import { ensureTestUsers, signTestToken, TEST_ADMIN_USER_ID } from "./auth-fixture.js";

// ============================================================
// G-2: photo values are validated as http(s) URLs or legacy image
// filenames. The backend is the source of truth; any http(s) host is
// accepted (no Cloudinary allow-list) so existing alumni data keeps
// working. javascript:, data:, vbscript:, empty and arbitrary strings
// are rejected on write. Stored values are never rewritten.
// ============================================================

const LEGACY_FILENAME = "alumni-photo_1.jpg";
const ORIGINAL_PHOTO = "https://example.com/original-photo.jpg";

let adminToken: string;
let photoAlumniId: ObjectId;

beforeAll(async () => {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is required for photo validation tests");
  }

  await connectDatabase();
  await ensureTestUsers();

  adminToken = signTestToken(TEST_ADMIN_USER_ID, "ADMIN");

  const inserted = await getAlumniCollection().insertOne({
    userId: new ObjectId(),
    fullName: "Photo Validation Alumni",
    angkatan: 12,
    program: "Informatics Engineering",
    photo: ORIGINAL_PHOTO,
    phone: "",
    location: "",
    currentStatus: "OTHER" as const,
    careerHistory: [],
    educationHistory: [],
    isPublic: false,
    reviewStatus: "PENDING" as const,
    profileCompleted: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  photoAlumniId = inserted.insertedId;
});

afterAll(async () => {
  await getAlumniCollection().deleteOne({ _id: photoAlumniId });
});

async function storedPhoto() {
  const doc = await getAlumniCollection().findOne({ _id: photoAlumniId });
  return doc?.photo;
}

function adminPatch(payload: Record<string, unknown>) {
  return request(app)
    .patch(`/api/alumni/${photoAlumniId.toHexString()}`)
    .set("Cookie", `rams_access_token=${adminToken}`)
    .send(payload);
}

describe("photo value validation helper", () => {
  it("accepts https photo URLs", () => {
    expect(isPhotoValue("https://example.com/profile/photo.jpg")).toBe(true);
    expect(
      isPhotoValue("https://res.cloudinary.com/demo/image/upload/v1/p.png"),
    ).toBe(true);
  });

  it("accepts http photo URLs for existing data compatibility", () => {
    expect(isPhotoValue("http://example.com/profile/photo.png")).toBe(true);
  });

  it("accepts legacy image filenames", () => {
    expect(isPhotoValue("alumni.jpg")).toBe(true);
    expect(isPhotoValue("alumni.jpeg")).toBe(true);
    expect(isPhotoValue("alumni-photo_1.jpg")).toBe(true);
    expect(isPhotoValue("alumni.png")).toBe(true);
    expect(isPhotoValue("alumni.webp")).toBe(true);
  });

  it("rejects javascript:, data: and vbscript: values", () => {
    expect(isPhotoValue("javascript:alert(1)")).toBe(false);
    expect(isPhotoValue("data:text/html,<script>alert(1)</script>")).toBe(
      false,
    );
    expect(isPhotoValue("vbscript:msgbox(1)")).toBe(false);
  });

  it("rejects empty and arbitrary values", () => {
    expect(isPhotoValue("")).toBe(false);
    expect(isPhotoValue("   ")).toBe(false);
    expect(isPhotoValue("just some text")).toBe(false);
    expect(isPhotoValue("ftp://example.com/photo.jpg")).toBe(false);
  });
});

describe("photo validation in the alumni schemas", () => {
  const accepted = [
    "https://example.com/photo.jpg",
    "http://example.com/photo.png",
    LEGACY_FILENAME,
    "legacy.png",
  ];

  const rejected = [
    "javascript:alert(1)",
    "data:text/html,<b>x</b>",
    "vbscript:msgbox(1)",
    "",
    "not a photo value",
  ];

  it.each(accepted)("accepts %s as an admin photo update", (photo) => {
    expect(updateAlumniSchema.safeParse({ photo }).success).toBe(true);
    expect(updateMyAlumniSchema.safeParse({ photo }).success).toBe(true);
  });

  it.each(rejected)("rejects %s as a photo update", (photo) => {
    expect(updateAlumniSchema.safeParse({ photo }).success).toBe(false);
    expect(updateMyAlumniSchema.safeParse({ photo }).success).toBe(false);
  });

  it("still allows omitting the photo field entirely", () => {
    expect(updateAlumniSchema.safeParse({}).success).toBe(true);
    expect(updateMyAlumniSchema.safeParse({}).success).toBe(true);
  });
});

describe("admin PATCH photo validation", () => {
  it("rejects a javascript: photo and leaves the stored photo untouched", async () => {
    const before = await storedPhoto();

    const rejected = await adminPatch({ photo: "javascript:alert(1)" });

    expect(rejected.status).toBe(400);
    expect(rejected.body.success).toBe(false);
    expect(await storedPhoto()).toBe(before);
  });

  it("rejects an empty photo and leaves the stored photo untouched", async () => {
    const before = await storedPhoto();

    const rejected = await adminPatch({ photo: "" });

    expect(rejected.status).toBe(400);
    expect(await storedPhoto()).toBe(before);
  });

  it("rejects an arbitrary photo string and leaves the stored photo untouched", async () => {
    const before = await storedPhoto();

    const rejected = await adminPatch({ photo: "definitely not a photo" });

    expect(rejected.status).toBe(400);
    expect(await storedPhoto()).toBe(before);
  });

  it("accepts a legacy image filename", async () => {
    const accepted = await adminPatch({ photo: LEGACY_FILENAME });

    expect(accepted.status).toBe(200);
    expect(await storedPhoto()).toBe(LEGACY_FILENAME);
  });

  it("accepts an http(s) photo URL from any host", async () => {
    const accepted = await adminPatch({ photo: ORIGINAL_PHOTO });

    expect(accepted.status).toBe(200);
    expect(await storedPhoto()).toBe(ORIGINAL_PHOTO);
  });
});
