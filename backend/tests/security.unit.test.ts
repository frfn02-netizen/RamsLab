import { describe, expect, it } from "vitest";
import jwt from "jsonwebtoken";
import request from "supertest";

process.env.JWT_SECRET ??=
  "unit-test-secret-that-is-at-least-32-characters-long";
process.env.NODE_ENV = "test";

import app from "../src/app.js";
import { verifyAccessToken } from "../src/modules/auth/auth.utils.js";
import { updateProjectSchema } from "../src/modules/projects/project.schema.js";
import { updatePartnerSchema } from "../src/modules/partners/partner.schema.js";
import { updateDosenSchema } from "../src/modules/dosen/dosen.schema.js";
import { updateTrackingSchema } from "../src/modules/tracking/tracking.schema.js";
import {
  updateAlumniSchema,
  updateMyAlumniSchema,
} from "../src/modules/alumni/alumni.schema.js";
import { createPublicationSchema } from "../src/modules/publications/publication.schema.js";
import { createPartnerSchema } from "../src/modules/partners/partner.schema.js";

const secret = process.env.JWT_SECRET!;

describe("security regressions", () => {
  it("rejects expired, malformed, forged-algorithm, and invalid-role JWTs", () => {
    expect(() => verifyAccessToken("not-a-jwt")).toThrow();

    const expired = jwt.sign(
      { userId: "507f1f77bcf86cd799439011", role: "ADMIN", tokenVersion: 0 },
      secret,
      { expiresIn: -1, algorithm: "HS256" },
    );
    expect(() => verifyAccessToken(expired)).toThrow();

    const forgedAlgorithm = jwt.sign(
      { userId: "507f1f77bcf86cd799439011", role: "ADMIN", tokenVersion: 0 },
      secret,
      { algorithm: "HS384", expiresIn: "1m" },
    );
    expect(() => verifyAccessToken(forgedAlgorithm)).toThrow();

    const invalidRole = jwt.sign(
      { userId: "507f1f77bcf86cd799439011", role: "ROOT", tokenVersion: 0 },
      secret,
      { algorithm: "HS256", expiresIn: "1m" },
    );
    expect(() => verifyAccessToken(invalidRole)).toThrow();
  });

  it("uses explicit update allowlists for every mutable document", () => {
    const attack = {
      role: "ADMIN",
      userId: "507f1f77bcf86cd799439011",
      _id: "507f1f77bcf86cd799439012",
      passwordHash: "attacker-controlled",
      createdAt: "2000-01-01T00:00:00.000Z",
      updatedAt: "2000-01-01T00:00:00.000Z",
      nim: "ATTACKED",
      published: true,
    };

    for (const schema of [
      updateProjectSchema,
      updatePartnerSchema,
      updateDosenSchema,
      updateTrackingSchema,
      updateAlumniSchema,
      updateMyAlumniSchema,
    ]) {
      const parsed = schema.parse(attack);
      expect(parsed).not.toHaveProperty("role");
      expect(parsed).not.toHaveProperty("userId");
      expect(parsed).not.toHaveProperty("_id");
      expect(parsed).not.toHaveProperty("passwordHash");
      expect(parsed).not.toHaveProperty("createdAt");
      expect(parsed).not.toHaveProperty("updatedAt");
      expect(parsed).not.toHaveProperty("nim");
    }
  });

  it("rejects executable URL schemes in externally rendered links", () => {
    const publication = {
      title: "Safe publication test",
      authors: ["Test author"],
      publicationType: "Article",
      year: 2026,
      journal: "Test journal",
      pdfUrl: "javascript:alert(1)",
      topics: [],
      methods: [],
    };
    expect(() => createPublicationSchema.parse(publication)).toThrow();

    const partner = {
      name: "Safe partner test",
      type: "UNIVERSITY",
      website: "data:text/html,<script>alert(1)</script>",
    };
    expect(() => createPartnerSchema.parse(partner)).toThrow();
  });

  it("rejects oversized JSON and malformed JSON without an internal error", async () => {
    const oversized = await request(app)
      .post("/api/auth/login")
      .set("Content-Type", "application/json")
      .send(
        JSON.stringify({ email: "a@b.test", password: "x".repeat(1_100_000) }),
      );
    expect(oversized.status).toBe(413);
    expect(oversized.body.message).toBe("Request body is too large");

    const malformed = await request(app)
      .post("/api/auth/login")
      .set("Content-Type", "application/json")
      .send("{bad json");
    expect(malformed.status).toBe(400);
    expect(malformed.body.message).toBe("Malformed JSON body");
  });

  it("rejects a malicious state-changing origin", async () => {
    const response = await request(app)
      .post("/api/auth/logout")
      .set("Origin", "https://evil.example");

    expect(response.status).toBe(403);
    expect(response.body.message).toBe("Cross-origin request denied");
    expect(response.headers["access-control-allow-origin"]).toBeUndefined();
  });

  it("allows public profile assets to load cross-site from the Vercel UI", async () => {
    const response = await request(app).get(
      "/uploads/dosen/nonexistent-profile.jpg",
    );

    expect(response.headers["cross-origin-resource-policy"]).toBe(
      "cross-origin",
    );
  });

  it("allows the configured origin and clears authentication cookies on logout", async () => {
    const response = await request(app)
      .post("/api/auth/logout")
      .set("Origin", "http://localhost:3000")
      .set("Cookie", [
        "rams_access_token=stale-token",
        "rams_csrf_token=csrf-token",
      ])
      .set("X-CSRF-Token", "csrf-token");

    expect(response.status).toBe(200);
    expect(response.headers["access-control-allow-origin"]).toBe(
      "http://localhost:3000",
    );
    expect(
      response.headers["set-cookie"]?.some((cookie: string) =>
        cookie.includes("rams_access_token=;"),
      ),
    ).toBe(true);
  });

  it("allows login to replace a stale access and CSRF cookie pair", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .set("Origin", "http://localhost:3000")
      .set("Cookie", [
        "rams_access_token=stale-token",
        "rams_csrf_token=old-csrf-token",
      ])
      .send({
        email: "stale-session-reset@example.test",
        password: "incorrect-password",
      });

    expect(response.status).toBe(401);
    expect(response.body.message).toBe("Invalid email or password");
  });

  it("rate-limits repeated login attempts", async () => {
    const responses = [];
    for (let attempt = 0; attempt < 11; attempt += 1) {
      responses.push(
        await request(app).post("/api/auth/login").send({
          email: "not-an-email",
          password: "x",
        }),
      );
    }

    expect(
      responses.slice(0, 10).every((response) => response.status === 401),
    ).toBe(true);
    expect(responses[10].status).toBe(429);
    expect(responses[10].body.message).toBe("Too many login attempts");
  });
});
