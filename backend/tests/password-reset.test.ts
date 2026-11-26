import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import request from "supertest";
import bcrypt from "bcrypt";
import { ObjectId } from "mongodb";

import app from "../src/app.js";
import { connectDatabase } from "../src/config/database.js";
import { getUsersCollection } from "../src/modules/users/user.repository.js";
import { getPasswordResetTokensCollection } from "../src/modules/auth/password-reset.repository.js";
import { getAuthAuditCollection } from "../src/modules/auth/auth.audit.js";
import { hashPasswordResetToken } from "../src/modules/auth/auth.utils.js";
import { setMailjetTransportForTesting } from "../src/lib/mailjet.js";
import { ensurePasswordUser } from "./auth-fixture.js";

const USER_ID = "00000000000000000000d001";
const EMAIL = "vitest.reset.user@test.local";
const CURRENT_PASSWORD = "current-password-123";
const NEW_PASSWORD = "new-password-456";

const USER_ID_2 = "00000000000000000000d002";
const EMAIL_2 = "vitest.reset.user2@test.local";
const PASSWORD_2 = "second-password-123";

const mailjetTransport = vi.fn();

async function login(email: string, password: string) {
  const response = await request(app)
    .post("/api/auth/login")
    .send({ email, password });
  const setCookies = (response.headers["set-cookie"] ?? []) as string[];
  const access =
    setCookies
      .find((cookie) => cookie.startsWith("rams_access_token="))
      ?.split(";")[0] ?? "";
  const csrf =
    setCookies
      .find((cookie) => cookie.startsWith("rams_csrf_token="))
      ?.split(";")[0] ?? "";
  const csrfToken = csrf.split("=")[1] ?? "";
  return { response, access, csrf, csrfToken };
}

async function clearResetState() {
  const ids = [new ObjectId(USER_ID), new ObjectId(USER_ID_2)];
  await getPasswordResetTokensCollection().deleteMany({ userId: { $in: ids } });
  await getAuthAuditCollection().deleteMany({ targetUserId: { $in: ids } });
}

async function seedResetToken(rawToken: string, userId: string, expiresInMs = 60_000) {
  await getPasswordResetTokensCollection().insertOne({
    userId: new ObjectId(userId),
    tokenHash: hashPasswordResetToken(rawToken),
    expiresAt: new Date(Date.now() + expiresInMs),
    usedAt: null,
    createdAt: new Date(),
  });
}

beforeAll(async () => {
  await connectDatabase();
  await ensurePasswordUser({
    id: USER_ID,
    email: EMAIL,
    password: CURRENT_PASSWORD,
    role: "ALUMNI",
    isActive: true,
    mustChangePassword: false,
  });
  await ensurePasswordUser({
    id: USER_ID_2,
    email: EMAIL_2,
    password: PASSWORD_2,
    role: "DOSEN",
    isActive: true,
    mustChangePassword: false,
  });
  await clearResetState();
  setMailjetTransportForTesting(mailjetTransport);
});

afterAll(async () => {
  await getUsersCollection().deleteMany({
    _id: { $in: [new ObjectId(USER_ID), new ObjectId(USER_ID_2)] },
  });
  await clearResetState();
  setMailjetTransportForTesting(null);
});

describe("password reset", () => {
  it("returns a generic response without creating a token or sending email", async () => {
    mailjetTransport.mockClear();

    const response = await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: EMAIL });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toContain("If an account matches");
    expect(
      await getPasswordResetTokensCollection().countDocuments({
        userId: new ObjectId(USER_ID),
      }),
    ).toBe(0);
    expect(mailjetTransport).not.toHaveBeenCalled();
  });

  it("returns the same generic response for a nonexistent email", async () => {
    const response = await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: "nobody-here@test.local" });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toContain("If an account matches");
  });

  it("applies a minimum response floor to existing and missing emails", async () => {
    const existingStart = Date.now();
    await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: EMAIL_2 });
    const existingMs = Date.now() - existingStart;

    const missingStart = Date.now();
    await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: "nobody-timing@test.local" });
    const missingMs = Date.now() - missingStart;

    expect(existingMs).toBeGreaterThanOrEqual(200);
    expect(missingMs).toBeGreaterThanOrEqual(200);
  });

  it("rejects an invalid reset token", async () => {
    const response = await request(app).post("/api/auth/reset-password").send({
      token: "invalid-token-value-that-does-not-exist",
      newPassword: "another-password-123",
    });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  it("rejects an expired reset token", async () => {
    const rawToken = "expired-token-value-1234567890";
    await seedResetToken(rawToken, USER_ID_2, -60_000);

    const response = await request(app)
      .post("/api/auth/reset-password")
      .send({ token: rawToken, newPassword: "another-password-123" });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  it("resets the password, revokes sessions, and invalidates the token", async () => {
    const rawToken = "valid-reset-token-1234567890";
    await seedResetToken(rawToken, USER_ID);

    const loginBefore = await login(EMAIL, CURRENT_PASSWORD);
    expect(loginBefore.response.status).toBe(200);

    const reset = await request(app)
      .post("/api/auth/reset-password")
      .send({ token: rawToken, newPassword: NEW_PASSWORD });

    expect(reset.status).toBe(200);
    expect(reset.body.success).toBe(true);

    const user = await getUsersCollection().findOne({
      _id: new ObjectId(USER_ID),
    });
    expect(user?.mustChangePassword).toBe(false);
    expect(user?.tokenVersion).toBe(1);
    expect(await bcrypt.compare(NEW_PASSWORD, user!.passwordHash)).toBe(true);

    const tokens = await getPasswordResetTokensCollection()
      .find({ userId: new ObjectId(USER_ID) })
      .toArray();
    expect(tokens).toHaveLength(0);

    const oldSession = await request(app)
      .get("/api/alumni/me")
      .set("Cookie", loginBefore.access);
    expect(oldSession.status).toBe(401);

    const oldPasswordLogin = await login(EMAIL, CURRENT_PASSWORD);
    expect(oldPasswordLogin.response.status).toBe(401);

    const newPasswordLogin = await login(EMAIL, NEW_PASSWORD);
    expect(newPasswordLogin.response.status).toBe(200);

    const reused = await request(app)
      .post("/api/auth/reset-password")
      .send({ token: rawToken, newPassword: "another-password-123" });
    expect(reused.status).toBe(400);
  });

  it("rejects a reset password that matches the current password", async () => {
    const rawToken = "same-password-token-1234567890";
    await seedResetToken(rawToken, USER_ID);

    const response = await request(app)
      .post("/api/auth/reset-password")
      .send({ token: rawToken, newPassword: NEW_PASSWORD });

    expect(response.status).toBe(422);
    expect(response.body.message).toMatch(
      /different from the current password/i,
    );
  });

  it("allows the recovery endpoints without a CSRF header even with a session", async () => {
    const session = await login(EMAIL, NEW_PASSWORD);
    expect(session.response.status).toBe(200);

    const response = await request(app)
      .post("/api/auth/forgot-password")
      .set("Cookie", [session.access, session.csrf])
      .send({ email: EMAIL });

    expect(response.status).toBe(200);
  });

  it("rejects a cross-origin recovery request", async () => {
    const response = await request(app)
      .post("/api/auth/forgot-password")
      .set("Origin", "https://evil.example")
      .send({ email: EMAIL });

    expect(response.status).toBe(403);
    expect(response.body.message).toBe("Cross-origin request denied");
  });

  it("rate limits repeated forgot-password requests for the same email", async () => {
    const email = "vitest.reset.ratelimit@test.local";
    const statuses: number[] = [];

    for (let attempt = 0; attempt < 6; attempt += 1) {
      const response = await request(app)
        .post("/api/auth/forgot-password")
        .send({ email });
      statuses.push(response.status);
    }

    expect(statuses.slice(0, 5).every((status) => status === 200)).toBe(true);
    expect(statuses[5]).toBe(429);
  });
});
