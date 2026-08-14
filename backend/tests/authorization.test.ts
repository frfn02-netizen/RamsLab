import { beforeAll, describe, expect, it, } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import app from "../src/app.js";
import { connectDatabase } from "../src/config/database.js";
import { ensureTestUsers, signTestToken, TEST_ADMIN_USER_ID, TEST_ALUMNI_USER_ID } from "./auth-fixture.js";

describe("Authorization", () => {
  beforeAll(async () => {
    await connectDatabase();
    await ensureTestUsers();
  });
  it("should reject non-admin users from admin endpoint", async () => {
    const secret = process.env.JWT_SECRET;

    if (!secret) {
      throw new Error(
        "JWT_SECRET is required for authorization tests"
      );
    }

    const token = signTestToken(TEST_ALUMNI_USER_ID, "ALUMNI");

    const response =
      await request(app)
        .get("/api/admin/test")
        .set(
          "Cookie",
          `rams_access_token=${token}`
        );

    expect(response.status).toBe(403);

    expect(response.body.success)
      .toBe(false);
  });


  it("should allow admin users to access admin endpoint", async () => {
    const secret = process.env.JWT_SECRET;

    if (!secret) {
      throw new Error(
        "JWT_SECRET is required for authorization tests"
      );
    }

    const token = signTestToken(TEST_ADMIN_USER_ID, "ADMIN");

    const response =
      await request(app)
        .get("/api/admin/test")
        .set(
          "Cookie",
          `rams_access_token=${token}`
        );

    expect(response.status).toBe(200);

    expect(response.body).toMatchObject({
      success: true,
      message: "Admin access granted",
    });
  });
});
