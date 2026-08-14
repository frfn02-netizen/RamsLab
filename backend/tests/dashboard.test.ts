import {
  beforeAll,
  describe,
  expect,
  it,
} from "vitest";

import request from "supertest";
import jwt from "jsonwebtoken";

import app from "../src/app.js";

import {
  connectDatabase,
} from "../src/config/database.js";
import { ensureTestUsers, signTestToken, TEST_ADMIN_USER_ID, TEST_DOSEN_USER_ID, TEST_ALUMNI_USER_ID } from "./auth-fixture.js";


let adminToken: string;
let dosenToken: string;
let alumniToken: string;


beforeAll(async () => {
  const secret =
    process.env.JWT_SECRET;

  if (!secret) {
    throw new Error(
      "JWT_SECRET is required for dashboard tests"
    );
  }

  await connectDatabase();
  await ensureTestUsers();

  adminToken = signTestToken(TEST_ADMIN_USER_ID, "ADMIN");

  dosenToken = signTestToken(TEST_DOSEN_USER_ID, "DOSEN");

  alumniToken = signTestToken(TEST_ALUMNI_USER_ID, "ALUMNI");
});


describe("Dashboard API", () => {

  it(
    "should get dashboard statistics as admin",
    async () => {
      const response =
        await request(app)
          .get("/api/dashboard")
          .set(
            "Cookie",
            `rams_access_token=${adminToken}`
          );

      expect(response.status)
        .toBe(200);

      expect(response.body.success)
        .toBe(true);

      expect(response.body.data)
        .toBeDefined();

      expect(
        typeof response.body.data.users
      ).toBe("number");

      expect(
        typeof response.body.data.alumni
      ).toBe("number");

      expect(
        typeof response.body.data.dosen
      ).toBe("number");

      expect(
        typeof response.body.data.projects
      ).toBe("number");

      expect(
        typeof response.body.data.universityPartners
      ).toBe("number");

      expect(
        typeof response.body.data.industrialPartners
      ).toBe("number");
    }
  );


  it(
    "should get dashboard statistics as dosen",
    async () => {
      const response =
        await request(app)
          .get("/api/dashboard")
          .set(
            "Cookie",
            `rams_access_token=${dosenToken}`
          );

      expect(response.status)
        .toBe(200);

      expect(response.body.success)
        .toBe(true);

      expect(response.body.data)
        .toBeDefined();

      expect(
        typeof response.body.data.users
      ).toBe("number");

      expect(
        typeof response.body.data.alumni
      ).toBe("number");

      expect(
        typeof response.body.data.dosen
      ).toBe("number");

      expect(
        typeof response.body.data.projects
      ).toBe("number");

      expect(
        typeof response.body.data.universityPartners
      ).toBe("number");

      expect(
        typeof response.body.data.industrialPartners
      ).toBe("number");
    }
  );


  it(
    "should reject dashboard access for alumni",
    async () => {
      const response =
        await request(app)
          .get("/api/dashboard")
          .set(
            "Cookie",
            `rams_access_token=${alumniToken}`
          );

      expect(response.status)
        .toBe(403);

      expect(response.body.success)
        .toBe(false);
    }
  );


  it(
    "should reject dashboard access without authentication",
    async () => {
      const response =
        await request(app)
          .get("/api/dashboard");

      expect(response.status)
        .toBe(401);

      expect(response.body.success)
        .toBe(false);
    }
  );


  it(
    "should return numeric dashboard statistics",
    async () => {
      const response =
        await request(app)
          .get("/api/dashboard")
          .set(
            "Cookie",
            `rams_access_token=${adminToken}`
          );

      expect(response.status)
        .toBe(200);

      expect(response.body.success)
        .toBe(true);

      expect(response.body.data)
        .toEqual(
          expect.objectContaining({
            users:
              expect.any(Number),

            alumni:
              expect.any(Number),

            dosen:
              expect.any(Number),

            projects:
              expect.any(Number),

            universityPartners:
              expect.any(Number),

            industrialPartners:
              expect.any(Number),
          })
        );
    }
  );


  it(
    "should reject an invalid JWT",
    async () => {
      const response =
        await request(app)
          .get("/api/dashboard")
          .set(
            "Cookie",
            "rams_access_token=invalid-token"
          );

      expect(response.status)
        .toBe(401);

      expect(response.body.success)
        .toBe(false);
    }
  );

});
