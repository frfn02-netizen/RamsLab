import { describe, expect, it, } from "vitest";
import request from "supertest";
import app from "../src/app.js";

describe("Authentication", () => {
  it("should reject protected endpoint without token", async () => {
    const response =
      await request(app)
        .get("/api/auth/me");

    expect(response.status).toBe(401);

    expect(response.body.success)
      .toBe(false);
  });


  it("should reject protected endpoint with invalid token", async () => {
    const response =
      await request(app)
        .get("/api/auth/me")
        .set(
          "Cookie",
          "rams_access_token=invalid-token"
        );

    expect(response.status).toBe(401);

    expect(response.body.success)
      .toBe(false);
  });
});