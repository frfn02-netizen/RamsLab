import { afterAll, beforeAll, describe, expect, it } from "vitest";
import bcrypt from "bcrypt";
import request from "supertest";
import { ObjectId } from "mongodb";
import app from "../src/app.js";
import { connectDatabase } from "../src/config/database.js";
import { getUsersCollection } from "../src/modules/users/user.repository.js";

const USER_ID = new ObjectId("00000000000000000000c001");
const EMAIL = "vitest.changepw@test.local";
const CURRENT_PASSWORD = "current-password-123";
const NEW_PASSWORD = "new-password-456";

let accessCookie = "";
let csrfCookie = "";
let csrfToken = "";

async function loginAsTestUser() {
  const login = await request(app).post("/api/auth/login").send({
    email: EMAIL,
    password: CURRENT_PASSWORD,
  });
  expect(login.status).toBe(200);

  const setCookies = (login.headers["set-cookie"] ?? []) as string[];
  const accessSetCookie =
    setCookies.find((c) => c.startsWith("rams_access_token=")) ?? "";
  accessCookie = accessSetCookie.split(";")[0] ?? "";

  const csrfSetCookie =
    setCookies.find((c) => c.startsWith("rams_csrf_token=")) ?? "";
  csrfCookie = csrfSetCookie.split(";")[0] ?? "";
  csrfToken = csrfCookie.split("=")[1] ?? "";

  expect(accessCookie).not.toBe("");
  expect(csrfToken).not.toBe("");
}

beforeAll(async () => {
  await connectDatabase();
  await getUsersCollection().replaceOne(
    { _id: USER_ID },
    {
      _id: USER_ID,
      email: EMAIL,
      passwordHash: await bcrypt.hash(CURRENT_PASSWORD, 10),
      role: "ALUMNI",
      isActive: true,
      tokenVersion: 0,
      mustChangePassword: true,
      lastLoginAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    { upsert: true },
  );
  await loginAsTestUser();
});

afterAll(async () => {
  await getUsersCollection().deleteOne({ _id: USER_ID });
});

describe("POST /api/auth/change-password", () => {
  it("changes password successfully with valid credentials", async () => {
    const res = await request(app)
      .post("/api/auth/change-password")
      .set("Cookie", [accessCookie, csrfCookie])
      .set("X-CSRF-Token", csrfToken)
      .send({ currentPassword: CURRENT_PASSWORD, newPassword: NEW_PASSWORD });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe("Password changed successfully");

    const user = await getUsersCollection().findOne({ _id: USER_ID });
    expect(user?.mustChangePassword).toBe(false);

    const passwordMatches = await bcrypt.compare(
      NEW_PASSWORD,
      user!.passwordHash,
    );
    expect(passwordMatches).toBe(true);
  });

  it("rejects incorrect current password", async () => {
    const res = await request(app)
      .post("/api/auth/change-password")
      .set("Cookie", [accessCookie, csrfCookie])
      .set("X-CSRF-Token", csrfToken)
      .send({
        currentPassword: "wrong-password",
        newPassword: "another-new-pw",
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("Current password is incorrect");
  });

  it("rejects new password shorter than 8 characters", async () => {
    const res = await request(app)
      .post("/api/auth/change-password")
      .set("Cookie", [accessCookie, csrfCookie])
      .set("X-CSRF-Token", csrfToken)
      .send({ currentPassword: NEW_PASSWORD, newPassword: "short" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("rejects empty current password", async () => {
    const res = await request(app)
      .post("/api/auth/change-password")
      .set("Cookie", [accessCookie, csrfCookie])
      .set("X-CSRF-Token", csrfToken)
      .send({ currentPassword: "", newPassword: "valid-new-password" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("rejects missing fields", async () => {
    const res = await request(app)
      .post("/api/auth/change-password")
      .set("Cookie", [accessCookie, csrfCookie])
      .set("X-CSRF-Token", csrfToken)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("rejects unauthenticated requests", async () => {
    const res = await request(app)
      .post("/api/auth/change-password")
      .send({ currentPassword: CURRENT_PASSWORD, newPassword: NEW_PASSWORD });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it("rejects requests without CSRF token header", async () => {
    const res = await request(app)
      .post("/api/auth/change-password")
      .set("Cookie", [accessCookie, csrfCookie])
      .send({ currentPassword: NEW_PASSWORD, newPassword: "yet-another-pw" });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("CSRF validation failed");
  });

  it("rejects requests with mismatched CSRF token", async () => {
    const res = await request(app)
      .post("/api/auth/change-password")
      .set("Cookie", [accessCookie, csrfCookie])
      .set("X-CSRF-Token", "totally-wrong-token")
      .send({ currentPassword: NEW_PASSWORD, newPassword: "yet-another-pw" });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("CSRF validation failed");
  });

  it("does not accept GET requests (returns 404)", async () => {
    const res = await request(app)
      .get("/api/auth/change-password")
      .set("Cookie", [accessCookie, csrfCookie]);

    expect(res.status).toBe(404);
  });

  it("rejects non-JSON body", async () => {
    const res = await request(app)
      .post("/api/auth/change-password")
      .set("Cookie", [accessCookie, csrfCookie])
      .set("X-CSRF-Token", csrfToken)
      .set("Content-Type", "text/plain")
      .send("not json");

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});
