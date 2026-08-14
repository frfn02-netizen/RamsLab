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
  getUsersCollection,
} from "../src/modules/users/user.repository.js";
import { ensureTestUsers, signTestToken, TEST_ADMIN_USER_ID } from "./auth-fixture.js";


const TEST_USER_ID =
  new ObjectId().toHexString();

const TEST_NIM =
  "VITEST-ALUMNI-001";

const TEST_FULL_NAME =
  "Vitest Alumni";

const TEST_USER_EMAIL =
  "vitest.alumni@test.local";


let adminToken: string;
let alumniToken: string;
let alumniId: string;


beforeAll(async () => {
  const secret =
    process.env.JWT_SECRET;

  if (!secret) {
    throw new Error(
      "JWT_SECRET is required for alumni tests"
    );
  }

  await connectDatabase();
  await ensureTestUsers();

  const users =
    getUsersCollection();

  await users.deleteMany({
    email: TEST_USER_EMAIL,
  });

  await users.insertOne({
    _id: new ObjectId(TEST_USER_ID),
    email: TEST_USER_EMAIL,
    passwordHash: "vitest-test-password",
    role: "ALUMNI",
    isActive: true,
    lastLoginAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const alumniCollection =
    getAlumniCollection();

  await alumniCollection.deleteMany({
    nim: TEST_NIM,
  });

  adminToken = signTestToken(TEST_ADMIN_USER_ID, "ADMIN");

  alumniToken = jwt.sign(
    {
      userId: TEST_USER_ID,
      role: "ALUMNI",
    },
    secret,
    {
      expiresIn: "1h",
      issuer: "rams-platform-api",
    }
  );
});


afterAll(async () => {
  const alumniCollection =
    getAlumniCollection();

  await alumniCollection.deleteMany({
    nim: TEST_NIM,
  });

  const users =
    getUsersCollection();

  await users.deleteOne({
    _id: new ObjectId(TEST_USER_ID),
  });
});


describe("Alumni API", () => {
  it("should create an alumni", async () => {
    const response =
      await request(app)
        .post("/api/alumni")
        .set(
          "Cookie",
          `rams_access_token=${adminToken}`
        )
        .send({
          userId: TEST_USER_ID,
          fullName: TEST_FULL_NAME,
          nim: TEST_NIM,
          graduationYear: 2026,
          program: "Informatics Engineering",
          phone: "081234567890",
          location: "Surabaya",
          currentStatus: "WORKING",
          currentCompany: "Vitest Company",
          currentPosition: "Software Engineer",
          linkedin:
            "https://www.linkedin.com/in/vitest-alumni",
          bio:
            "Alumni created for automated testing.",
          careerHistory: [],
          educationHistory: [],
          isPublic: true,
        });

    expect(response.status)
      .toBe(201);

    expect(response.body.success)
      .toBe(true);

    expect(
      response.body.data.fullName
    ).toBe(TEST_FULL_NAME);

    expect(
      response.body.data.nim
    ).toBe(TEST_NIM);

    alumniId =
      response.body.data._id;
  });


  it("should get alumni list", async () => {
    const response =
      await request(app)
        .get("/api/alumni")
        .set(
          "Cookie",
          `rams_access_token=${adminToken}`
        )
        .query({
          page: 1,
          limit: 10,
        });

    expect(response.status)
      .toBe(200);

    expect(response.body.success)
      .toBe(true);

    expect(
      Array.isArray(response.body.data)
    ).toBe(true);

    expect(
      response.body.data.some(
        (alumni: any) =>
          alumni.nim === TEST_NIM
      )
    ).toBe(true);

    expect(
      response.body.pagination.total
    ).toBeGreaterThan(0);
  });


  it("should search alumni by NIM", async () => {
    const response =
      await request(app)
        .get("/api/alumni")
        .set(
          "Cookie",
          `rams_access_token=${adminToken}`
        )
        .query({
          search: TEST_NIM,
        });

    expect(response.status)
      .toBe(200);

    expect(response.body.success)
      .toBe(true);

    expect(
      response.body.data.length
    ).toBeGreaterThan(0);

    expect(
      response.body.data.some(
        (alumni: any) =>
          alumni.nim === TEST_NIM
      )
    ).toBe(true);
  });


  it("should get alumni by id", async () => {
    const response =
      await request(app)
        .get(`/api/alumni/${alumniId}`)
        .set(
          "Cookie",
          `rams_access_token=${adminToken}`
        );

    expect(response.status)
      .toBe(200);

    expect(response.body.success)
      .toBe(true);

    expect(
      response.body.data._id
    ).toBe(alumniId);

    expect(
      response.body.data.nim
    ).toBe(TEST_NIM);
  });


  it("should get alumni by current user", async () => {
    const response =
      await request(app)
        .get("/api/alumni/me")
        .set(
          "Cookie",
          `rams_access_token=${alumniToken}`
        );

    expect(response.status)
      .toBe(200);

    expect(response.body.success)
      .toBe(true);

    expect(
      response.body.data.userId
    ).toBe(TEST_USER_ID);
  });


  it("should reject invalid alumni id", async () => {
    const response =
      await request(app)
        .get("/api/alumni/invalid-id")
        .set(
          "Cookie",
          `rams_access_token=${adminToken}`
        );

    expect(response.status)
      .toBe(404);

    expect(response.body.success)
      .toBe(false);
  });


  it("should reject invalid alumni body", async () => {
    const response =
      await request(app)
        .post("/api/alumni")
        .set(
          "Cookie",
          `rams_access_token=${adminToken}`
        )
        .send({});

    expect(response.status)
      .toBe(400);

    expect(response.body.success)
      .toBe(false);
  });


  it("should reject invalid pagination page", async () => {
    const response =
      await request(app)
        .get("/api/alumni")
        .set(
          "Cookie",
          `rams_access_token=${adminToken}`
        )
        .query({
          page: 0,
          limit: 10,
        });

    expect(response.status)
      .toBe(400);

    expect(response.body.message)
      .toBe(
        "Page must be a positive integer"
      );
  });


  it("should reject invalid pagination limit", async () => {
    const response =
      await request(app)
        .get("/api/alumni")
        .set(
          "Cookie",
          `rams_access_token=${adminToken}`
        )
        .query({
          page: 1,
          limit: 0,
        });

    expect(response.status)
      .toBe(400);

    expect(response.body.message)
      .toBe(
        "Limit must be a positive integer"
      );
  });


  it("should update my alumni profile", async () => {
    const response =
      await request(app)
        .patch("/api/alumni/me")
        .set(
          "Cookie",
          `rams_access_token=${alumniToken}`
        )
        .send({
          currentPosition:
            "Senior Software Engineer",
          location: "Jakarta",
        });

    expect(response.status)
      .toBe(200);

    expect(response.body.success)
      .toBe(true);

    expect(
      response.body.data.currentPosition
    ).toBe(
      "Senior Software Engineer"
    );

    expect(
      response.body.data.location
    ).toBe("Jakarta");
  });


  it("should update alumni as admin", async () => {
    const response =
      await request(app)
        .patch(`/api/alumni/${alumniId}`)
        .set(
          "Cookie",
          `rams_access_token=${adminToken}`
        )
        .send({
          currentCompany:
            "Updated Vitest Company",
        });

    expect(response.status)
      .toBe(200);

    expect(response.body.success)
      .toBe(true);

    expect(
      response.body.data.currentCompany
    ).toBe(
      "Updated Vitest Company"
    );
  });
});

it("should reject modification of immutable alumni fields", async () => {
  const response =
    await request(app)
      .patch("/api/alumni/me")
      .set(
        "Cookie",
        `rams_access_token=${alumniToken}`
      )
      .send({
        nim: "MALICIOUS-NIM-999",
        userId: new ObjectId()
          .toHexString(),
      });

  expect(response.status)
    .toBe(200);

  expect(response.body.success)
    .toBe(true);

  expect(response.body.data.nim)
    .toBe(TEST_NIM);

  expect(response.body.data.userId)
    .toBe(TEST_USER_ID);
});

it("should not allow alumni to modify academic identity fields", async () => {
  const response =
    await request(app)
      .patch("/api/alumni/me")
      .set(
        "Cookie",
        `rams_access_token=${alumniToken}`
      )
      .send({
        nim: "MALICIOUS-NIM-999",
        graduationYear: 2099,
        program: "Unauthorized Program",
      });

  expect(response.status)
    .toBe(200);

  expect(response.body.success)
    .toBe(true);

  expect(response.body.data.nim)
    .toBe(TEST_NIM);

  expect(response.body.data.graduationYear)
    .not
    .toBe(2099);

  expect(response.body.data.program)
    .not
    .toBe("Unauthorized Program");
});

it("should not allow alumni to modify immutable fields", async () => {
  const response =
    await request(app)
      .patch("/api/alumni/me")
      .set(
        "Cookie",
        `rams_access_token=${alumniToken}`
      )
      .send({
        nim: "ATTACKED-NIM",
        userId: new ObjectId().toHexString(),
        createdAt: "2000-01-01T00:00:00.000Z",
        updatedAt: "2000-01-01T00:00:00.000Z",
        currentPosition:
          "Security Test Engineer",
      });

  expect(response.status).toBe(200);

  expect(response.body.success).toBe(true);

  expect(response.body.data.nim)
    .toBe(TEST_NIM);

  expect(response.body.data.userId)
    .toBe(TEST_USER_ID);

  expect(response.body.data.currentPosition)
    .toBe("Security Test Engineer");
});
