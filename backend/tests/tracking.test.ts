import {
  beforeAll,
  afterAll,
  describe,
  expect,
  it,
} from "vitest";

import request from "supertest";
import jwt from "jsonwebtoken";
import { ObjectId } from "mongodb";

import app from "../src/app.js";

import {
  connectDatabase,
} from "../src/config/database.js";

import {
  getAlumniCollection,
} from "../src/modules/alumni/alumni.repository.js";

import {
  getTrackingCollection,
} from "../src/modules/tracking/tracking.respository.js";
import { ensureTestUsers, signTestToken, TEST_ADMIN_USER_ID, TEST_DOSEN_USER_ID } from "./auth-fixture.js";


const TEST_ALUMNI_ID =
  new ObjectId();

const TEST_NIM =
  "VITEST-TRACKING-001";

const TEST_TRACKING_TITLE =
  "Vitest Tracking";

const TEST_USER_ID =
  new ObjectId();

let adminToken: string;
let dosenToken: string;
let trackingId: string;


beforeAll(async () => {
  const secret =
    process.env.JWT_SECRET;

  if (!secret) {
    throw new Error(
      "JWT_SECRET is required for tracking tests"
    );
  }

  await connectDatabase();
  await ensureTestUsers();

  const alumniCollection =
    getAlumniCollection();

  const trackingCollection =
    getTrackingCollection();

  await trackingCollection.deleteMany({
    alumniId: TEST_ALUMNI_ID,
  });

  await alumniCollection.deleteMany({
    nim: TEST_NIM,
  });

  await alumniCollection.insertOne({
    _id: TEST_ALUMNI_ID,
    userId: TEST_USER_ID,
    fullName: "Vitest Tracking Alumni",
    nim: TEST_NIM,
    graduationYear: 2026,
    program: "Informatics Engineering",
    currentStatus: "WORKING",
    isPublic: true,
    careerHistory: [],
    educationHistory: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  adminToken = signTestToken(TEST_ADMIN_USER_ID, "ADMIN");

  dosenToken = signTestToken(TEST_DOSEN_USER_ID, "DOSEN");
});


afterAll(async () => {
  const trackingCollection =
    getTrackingCollection();

  const alumniCollection =
    getAlumniCollection();

  await trackingCollection.deleteMany({
    alumniId: TEST_ALUMNI_ID,
  });

  await alumniCollection.deleteOne({
    _id: TEST_ALUMNI_ID,
  });
});


describe("Tracking API", () => {
  it("should create alumni tracking", async () => {
    const response =
      await request(app)
        .post(
          `/api/tracking/alumni/${TEST_ALUMNI_ID.toHexString()}`
        )
        .set(
          "Cookie",
          `rams_access_token=${adminToken}`
        )
        .send({
          type: "EMPLOYMENT",
          title: TEST_TRACKING_TITLE,
          company: "Vitest Company",
          position: "Software Engineer",
          location: "Surabaya",
          startDate: "2026-01-01",
          endDate: null,
          description:
            "Tracking record created for automated testing.",
        });

    expect(response.status)
      .toBe(201);

    expect(response.body.success)
      .toBe(true);

    expect(
      response.body.data.title
    ).toBe(TEST_TRACKING_TITLE);

    expect(
      response.body.data.alumniId
    ).toBe(
      TEST_ALUMNI_ID.toHexString()
    );

    trackingId =
      response.body.data._id;
  });


  it("should get tracking by alumni id", async () => {
    const response =
      await request(app)
        .get(
          `/api/tracking/alumni/${TEST_ALUMNI_ID.toHexString()}`
        )
        .set(
          "Cookie",
          `rams_access_token=${dosenToken}`
        );

    expect(response.status)
      .toBe(200);

    expect(response.body.success)
      .toBe(true);

    expect(
      Array.isArray(response.body.data)
    ).toBe(true);

    expect(
      response.body.data.some(
        (tracking: any) =>
          tracking.title === TEST_TRACKING_TITLE
      )
    ).toBe(true);
  });


  it("should get tracking by id", async () => {
    const response =
      await request(app)
        .get(
          `/api/tracking/${trackingId}`
        )
        .set(
          "Cookie",
          `rams_access_token=${dosenToken}`
        );

    expect(response.status)
      .toBe(200);

    expect(response.body.success)
      .toBe(true);

    expect(
      response.body.data._id
    ).toBe(trackingId);

    expect(
      response.body.data.title
    ).toBe(TEST_TRACKING_TITLE);
  });


  it("should reject invalid alumni id", async () => {
    const response =
      await request(app)
        .get(
          "/api/tracking/alumni/invalid-id"
        )
        .set(
          "Cookie",
          `rams_access_token=${dosenToken}`
        );

    expect(response.status)
      .toBe(400);

    expect(response.body.success)
      .toBe(false);

    expect(response.body.message)
      .toBe("Invalid alumni ID");
  });


  it("should reject invalid tracking id", async () => {
    const response =
      await request(app)
        .get(
          "/api/tracking/invalid-id"
        )
        .set(
          "Cookie",
          `rams_access_token=${dosenToken}`
        );

    expect(response.status)
      .toBe(404);

    expect(response.body.success)
      .toBe(false);

    expect(response.body.message)
      .toBe("Tracking not found");
  });


  it("should reject invalid tracking body", async () => {
    const response =
      await request(app)
        .post(
          `/api/tracking/alumni/${TEST_ALUMNI_ID.toHexString()}`
        )
        .set(
          "Cookie",
          `rams_access_token=${adminToken}`
        )
        .send({});

    expect(response.status)
      .toBe(400);

    expect(response.body.success)
      .toBe(false);

    expect(response.body.message)
      .toBe("Validation failed");
  });


  it("should reject create tracking with invalid alumni id", async () => {
    const response =
      await request(app)
        .post(
          "/api/tracking/alumni/invalid-id"
        )
        .set(
          "Cookie",
          `rams_access_token=${adminToken}`
        )
        .send({
          type: "EMPLOYMENT",
          title: "Invalid Alumni Tracking",
          startDate: "2026-01-01",
          endDate: null,
        });

    expect(response.status)
      .toBe(400);

    expect(response.body.success)
      .toBe(false);

    expect(response.body.message)
      .toBe("Invalid alumni ID");
  });


  it("should update alumni tracking", async () => {
    const response =
      await request(app)
        .patch(
          `/api/tracking/${trackingId}`
        )
        .set(
          "Cookie",
          `rams_access_token=${adminToken}`
        )
        .send({
          position:
            "Senior Software Engineer",
          location: "Jakarta",
        });

    expect(response.status)
      .toBe(200);

    expect(response.body.success)
      .toBe(true);

    expect(
      response.body.data.position
    ).toBe(
      "Senior Software Engineer"
    );

    expect(
      response.body.data.location
    ).toBe("Jakarta");
  });


  it("should reject invalid tracking update id", async () => {
    const response =
      await request(app)
        .patch(
          "/api/tracking/invalid-id"
        )
        .set(
          "Cookie",
          `rams_access_token=${adminToken}`
        )
        .send({
          position: "Invalid Update",
        });

    expect(response.status)
      .toBe(400);

    expect(response.body.success)
      .toBe(false);

    expect(response.body.message)
      .toBe("Invalid tracking ID");
  });


  it("should reject tracking update for missing record", async () => {
    const missingId =
      new ObjectId().toHexString();

    const response =
      await request(app)
        .patch(
          `/api/tracking/${missingId}`
        )
        .set(
          "Cookie",
          `rams_access_token=${adminToken}`
        )
        .send({
          position: "Missing Record",
        });

    expect(response.status)
      .toBe(404);

    expect(response.body.success)
      .toBe(false);

    expect(response.body.message)
      .toBe("Tracking not found");
  });


  it("should delete alumni tracking", async () => {
    const response =
      await request(app)
        .delete(
          `/api/tracking/${trackingId}`
        )
        .set(
          "Cookie",
          `rams_access_token=${adminToken}`
        );

    expect(response.status)
      .toBe(200);

    expect(response.body.success)
      .toBe(true);

    expect(
      response.body.message
    ).toBe(
      "Tracking deleted successfully"
    );

    const deleted =
      await getTrackingCollection().findOne({
        _id: new ObjectId(trackingId),
      });

    expect(deleted)
      .toBeNull();
  });


  it("should reject invalid tracking delete id", async () => {
    const response =
      await request(app)
        .delete(
          "/api/tracking/invalid-id"
        )
        .set(
          "Cookie",
          `rams_access_token=${adminToken}`
        );

    expect(response.status)
      .toBe(400);

    expect(response.body.success)
      .toBe(false);

    expect(response.body.message)
      .toBe("Invalid tracking ID");
  });
});
