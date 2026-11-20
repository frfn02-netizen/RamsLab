import { beforeAll, describe, expect, it } from "vitest";
import request from "supertest";

import app from "../src/app.js";
import { setEmailProviderForTesting } from "../src/lib/email.js";
import { connectDatabase } from "../src/config/database.js";
import {
  ensureTestUsers,
  signTestToken,
  TEST_ADMIN_USER_ID,
  TEST_DOSEN_USER_ID,
} from "./auth-fixture.js";

beforeAll(async () => {
  delete process.env.TRUST_PROXY;
  setEmailProviderForTesting(null);
  await connectDatabase();
  await ensureTestUsers();
});

describe("admin health visibility", () => {
  it("exposes operational authentication flags only to admins", async () => {
    const adminToken = signTestToken(TEST_ADMIN_USER_ID, "ADMIN");
    const response = await request(app)
      .get("/api/admin/health")
      .set("Cookie", `rams_access_token=${adminToken}`);

    expect(response.status).toBe(200);
    expect(response.headers["cache-control"]).toBe("no-store");
    expect(response.body.success).toBe(true);
    expect(typeof response.body.data.emailDeliveryConfigured).toBe("boolean");
    expect(typeof response.body.data.provider).toBe("string");
    expect(typeof response.body.data.resendApiKeyConfigured).toBe("boolean");
    expect(typeof response.body.data.emailFromConfigured).toBe("boolean");
    expect(
      response.body.data.emailFromDomain === null ||
        typeof response.body.data.emailFromDomain === "string",
    ).toBe(true);
    expect(typeof response.body.data.gmailSmtpConfigured).toBe("boolean");
    expect(typeof response.body.data.gmailSmtpHost).toBe("string");
    expect(typeof response.body.data.gmailSmtpPort).toBe("number");
    expect(typeof response.body.data.gmailSmtpUserConfigured).toBe("boolean");
    expect(typeof response.body.data.gmailAppPasswordConfigured).toBe(
      "boolean",
    );
    expect(typeof response.body.data.gmailFromCompatible).toBe("boolean");
    expect(typeof response.body.data.trustProxyConfigured).toBe("boolean");
    expect(["disabled", "hop-count", "trusted-list"]).toContain(
      response.body.data.trustProxyMode,
    );
  });

  it("shows Gmail configuration status without exposing credentials", async () => {
    const previous = {
      provider: process.env.EMAIL_PROVIDER,
      from: process.env.EMAIL_FROM,
      host: process.env.GMAIL_SMTP_HOST,
      port: process.env.GMAIL_SMTP_PORT,
      user: process.env.GMAIL_SMTP_USER,
      appPassword: process.env.GMAIL_SMTP_APP_PASSWORD,
    };
    const user = "fake-rams-sender@gmail.com";
    const appPassword = "abcdefghijklmnop";

    process.env.EMAIL_PROVIDER = "gmail";
    process.env.EMAIL_FROM = `RAMS Platform <${user}>`;
    process.env.GMAIL_SMTP_HOST = "smtp.gmail.com";
    process.env.GMAIL_SMTP_PORT = "587";
    process.env.GMAIL_SMTP_USER = user;
    process.env.GMAIL_SMTP_APP_PASSWORD = appPassword;
    setEmailProviderForTesting(null);

    try {
      const adminToken = signTestToken(TEST_ADMIN_USER_ID, "ADMIN");
      const response = await request(app)
        .get("/api/admin/health")
        .set("Cookie", `rams_access_token=${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.provider).toBe("gmail");
      expect(response.body.data.emailDeliveryConfigured).toBe(true);
      expect(response.body.data.gmailSmtpConfigured).toBe(true);
      expect(response.body.data.gmailSmtpHost).toBe("smtp.gmail.com");
      expect(response.body.data.gmailSmtpPort).toBe(587);
      expect(response.body.data.gmailSmtpUserConfigured).toBe(true);
      expect(response.body.data.gmailAppPasswordConfigured).toBe(true);
      expect(response.body.data.gmailFromCompatible).toBe(true);

      const serialized = JSON.stringify(response.body);
      expect(serialized).not.toContain(user);
      expect(serialized).not.toContain(appPassword);
    } finally {
      if (previous.provider === undefined) delete process.env.EMAIL_PROVIDER;
      else process.env.EMAIL_PROVIDER = previous.provider;
      if (previous.from === undefined) delete process.env.EMAIL_FROM;
      else process.env.EMAIL_FROM = previous.from;
      if (previous.host === undefined) delete process.env.GMAIL_SMTP_HOST;
      else process.env.GMAIL_SMTP_HOST = previous.host;
      if (previous.port === undefined) delete process.env.GMAIL_SMTP_PORT;
      else process.env.GMAIL_SMTP_PORT = previous.port;
      if (previous.user === undefined) delete process.env.GMAIL_SMTP_USER;
      else process.env.GMAIL_SMTP_USER = previous.user;
      if (previous.appPassword === undefined)
        delete process.env.GMAIL_SMTP_APP_PASSWORD;
      else process.env.GMAIL_SMTP_APP_PASSWORD = previous.appPassword;
    }
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
