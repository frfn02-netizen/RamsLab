import { afterEach, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";

import app from "../src/app.js";
import { setMailjetTransportForTesting } from "../src/lib/mailjet.js";
import { connectDatabase } from "../src/config/database.js";
import {
  ensureTestUsers,
  signTestToken,
  TEST_ADMIN_USER_ID,
  TEST_DOSEN_USER_ID,
} from "./auth-fixture.js";

const ENV_KEYS = [
  "MAILJET_API_KEY",
  "MAILJET_SECRET_KEY",
  "MAILJET_API_SECRET",
  "MAILJET_SENDER_EMAIL",
  "MAILJET_SENDER_NAME",
  "MAILJET_DRY_RUN",
] as const;
const originalEnv = Object.fromEntries(
  ENV_KEYS.map((key) => [key, process.env[key]]),
) as Record<(typeof ENV_KEYS)[number], string | undefined>;

function restoreEnv() {
  for (const key of ENV_KEYS) {
    const value = originalEnv[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

beforeAll(async () => {
  delete process.env.TRUST_PROXY;
  setMailjetTransportForTesting(null);
  await connectDatabase();
  await ensureTestUsers();
});

afterEach(() => {
  restoreEnv();
  setMailjetTransportForTesting(null);
});

describe("admin health visibility", () => {
  it("exposes mailer diagnostics only to admins", async () => {
    const adminToken = signTestToken(TEST_ADMIN_USER_ID, "ADMIN");
    const response = await request(app)
      .get("/api/admin/health")
      .set("Cookie", `rams_access_token=${adminToken}`);

    expect(response.status).toBe(200);
    expect(response.headers["cache-control"]).toBe("no-store");
    expect(response.body.success).toBe(true);
    expect(typeof response.body.data.emailDeliveryConfigured).toBe("boolean");
    expect(response.body.data.provider).toBe("mailjet");
    expect(typeof response.body.data.mailjetConfigured).toBe("boolean");
    expect(typeof response.body.data.mailjetApiKeyConfigured).toBe("boolean");
    expect(typeof response.body.data.mailjetSecretKeyConfigured).toBe(
      "boolean",
    );
    expect(typeof response.body.data.mailjetSenderEmailConfigured).toBe(
      "boolean",
    );
    expect(
      response.body.data.mailjetSenderDomain === null ||
        typeof response.body.data.mailjetSenderDomain === "string",
    ).toBe(true);
    expect(typeof response.body.data.mailjetSenderNameConfigured).toBe(
      "boolean",
    );
    expect(typeof response.body.data.dryRun).toBe("boolean");
    expect(typeof response.body.data.trustProxyConfigured).toBe("boolean");
    expect(["disabled", "hop-count", "trusted-list"]).toContain(
      response.body.data.trustProxyMode,
    );
    expect(response.body.data).not.toHaveProperty("resendApiKeyConfigured");
    expect(response.body.data).not.toHaveProperty("gmailSmtpConfigured");
  });

  it("shows Mailjet configuration status without exposing credentials", async () => {
    const apiKey = "mailjet-health-key";
    const secretKey = "mailjet-health-secret";
    process.env.MAILJET_API_KEY = apiKey;
    process.env.MAILJET_SECRET_KEY = secretKey;
    process.env.MAILJET_SENDER_EMAIL = "no-reply@rams.test";
    process.env.MAILJET_SENDER_NAME = "RAMS Platform";
    delete process.env.MAILJET_DRY_RUN;

    const adminToken = signTestToken(TEST_ADMIN_USER_ID, "ADMIN");
    const response = await request(app)
      .get("/api/admin/health")
      .set("Cookie", `rams_access_token=${adminToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data.mailjetConfigured).toBe(true);
    expect(response.body.data.emailDeliveryConfigured).toBe(true);
    expect(response.body.data.mailjetApiKeyConfigured).toBe(true);
    expect(response.body.data.mailjetSecretKeyConfigured).toBe(true);
    expect(response.body.data.mailjetSenderEmailConfigured).toBe(true);
    expect(response.body.data.mailjetSenderDomain).toBe("rams.test");
    expect(response.body.data.mailjetSenderNameConfigured).toBe(true);
    expect(response.body.data.dryRun).toBe(true);

    const serialized = JSON.stringify(response.body);
    expect(serialized).not.toContain(apiKey);
    expect(serialized).not.toContain(secretKey);
  });

  it("rejects non-admin and unauthenticated access", async () => {
    const dosenToken = signTestToken(TEST_DOSEN_USER_ID, "DOSEN");
    const forbidden = await request(app)
      .get("/api/admin/health")
      .set("Cookie", `rams_access_token=${dosenToken}`);
    expect(forbidden.status).toBe(403);

    const unauthenticated = await request(app).get("/api/admin/health");
    expect(unauthenticated.status).toBe(401);
  });

  it("does not expose operational flags on the public health endpoint", async () => {
    const response = await request(app).get("/api/health");
    expect(response.status).toBe(200);
    expect(response.body).not.toHaveProperty("emailDeliveryConfigured");
    expect(response.body).not.toHaveProperty("trustProxyConfigured");
    expect(response.body.data).toBeUndefined();
  });
});
