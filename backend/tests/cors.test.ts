import { afterEach, describe, expect, it } from "vitest";
import request from "supertest";
import app from "../src/app.js";
import { getAllowedOrigins } from "../src/config/security.js";

const FRONTEND_ORIGIN = "http://localhost:3000";
const UNTRUSTED_ORIGIN = "http://evil.example";

const originalNodeEnv = process.env.NODE_ENV;
const originalFrontendUrl = process.env.FRONTEND_URL;

afterEach(() => {
  process.env.NODE_ENV = originalNodeEnv;
  process.env.FRONTEND_URL = originalFrontendUrl;
});

function splitHeader(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
}

describe("CORS preflight", () => {
  it.each(["/api/auth/forgot-password", "/api/auth/login"])(
    "allows the local frontend preflight for %s",
    async (path) => {
      const response = await request(app)
        .options(path)
        .set("Origin", FRONTEND_ORIGIN)
        .set("Access-Control-Request-Method", "POST")
        .set("Access-Control-Request-Headers", "content-type, x-csrf-token");

      expect(response.status).toBe(204);
      expect(response.headers["access-control-allow-origin"]).toBe(
        FRONTEND_ORIGIN,
      );
      expect(response.headers["access-control-allow-origin"]).not.toBe("*");
      expect(response.headers["access-control-allow-credentials"]).toBe(
        "true",
      );
      expect(
        splitHeader(response.headers["access-control-allow-methods"]),
      ).toEqual(expect.arrayContaining(["post", "options"]));
      expect(
        splitHeader(response.headers["access-control-allow-headers"]),
      ).toEqual(expect.arrayContaining(["content-type", "x-csrf-token"]));
    },
  );

  it("rejects an untrusted origin without CORS approval", async () => {
    const response = await request(app)
      .options("/api/auth/forgot-password")
      .set("Origin", UNTRUSTED_ORIGIN)
      .set("Access-Control-Request-Method", "POST")
      .set("Access-Control-Request-Headers", "content-type");

    expect(response.status).toBe(403);
    expect(response.headers["access-control-allow-origin"]).toBeUndefined();
    expect(
      response.headers["access-control-allow-credentials"],
    ).toBeUndefined();
    expect(response.headers.allow).toBeUndefined();
    expect(response.body.message).toBe("Origin is not allowed");
  });
});

describe("CORS and state-changing requests", () => {
  it("rejects an untrusted origin before logout runs", async () => {
    const response = await request(app)
      .post("/api/auth/logout")
      .set("Origin", UNTRUSTED_ORIGIN);

    expect(response.status).toBe(403);
    expect(response.body.message).toBe("Cross-origin request denied");
    expect(response.headers["access-control-allow-origin"]).toBeUndefined();
  });

  it("still requires authentication for change-password", async () => {
    const response = await request(app)
      .post("/api/auth/change-password")
      .set("Origin", FRONTEND_ORIGIN)
      .send({ currentPassword: "old-password", newPassword: "new-password" });

    expect(response.status).toBe(401);
    expect(response.body.message).toBe("Authentication required");
  });

  it("still enforces CSRF validation for authenticated cookie requests", async () => {
    const response = await request(app)
      .post("/api/auth/change-password")
      .set("Origin", FRONTEND_ORIGIN)
      .set("Cookie", [
        "rams_access_token=test-token",
        "rams_csrf_token=csrf-cookie",
      ])
      .send({ currentPassword: "old-password", newPassword: "new-password" });

    expect(response.status).toBe(403);
    expect(response.body.message).toBe("CSRF validation failed");
  });
});

describe("allowed origin configuration", () => {
  it("adds localhost in development even when FRONTEND_URL points elsewhere", () => {
    process.env.NODE_ENV = "development";
    process.env.FRONTEND_URL = "https://rams.example";

    const origins = getAllowedOrigins();

    expect(origins).toEqual(
      expect.arrayContaining([
        "https://rams.example",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
      ]),
    );
  });

  it("uses only explicitly configured origins in production", () => {
    process.env.NODE_ENV = "production";
    process.env.FRONTEND_URL =
      "https://rams.example,https://admin.rams.example";

    expect(getAllowedOrigins()).toEqual([
      "https://rams.example",
      "https://admin.rams.example",
    ]);
  });
});
