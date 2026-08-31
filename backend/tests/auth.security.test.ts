import { afterAll, beforeAll, describe, expect, it } from "vitest";
import bcrypt from "bcrypt";
import request from "supertest";
import { ObjectId } from "mongodb";
import app from "../src/app.js";
import { connectDatabase } from "../src/config/database.js";
import { getUsersCollection } from "../src/modules/users/user.repository.js";

const USER_ID = new ObjectId("00000000000000000000a099");
const EMAIL = "vitest.auth.security@test.local";
const PASSWORD = "correct-test-password";

let accessCookie = "";
let csrfCookie = "";

beforeAll(async () => {
  await connectDatabase();
  await getUsersCollection().replaceOne(
    { _id: USER_ID },
    {
      _id: USER_ID,
      email: EMAIL,
      passwordHash: await bcrypt.hash(PASSWORD, 10),
      role: "ALUMNI",
      isActive: true,
      tokenVersion: 0,
      lastLoginAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    { upsert: true },
  );
});

afterAll(async () => {
  await getUsersCollection().deleteOne({ _id: USER_ID });
});

describe("authentication security", () => {
  it("returns a generic error for invalid credentials", async () => {
    const response = await request(app).post("/api/auth/login").send({
      email: EMAIL,
      password: "wrong-password",
    });

    expect(response.status).toBe(401);
    expect(response.body.message).toBe("Invalid email or password");
  });

  it("rejects inactive users", async () => {
    await getUsersCollection().updateOne(
      { _id: USER_ID },
      { $set: { isActive: false } },
    );
    const response = await request(app).post("/api/auth/login").send({
      email: EMAIL,
      password: PASSWORD,
    });
    await getUsersCollection().updateOne(
      { _id: USER_ID },
      { $set: { isActive: true } },
    );

    expect(response.status).toBe(401);
    expect(response.body.message).toBe("Invalid email or password");
  });

  it("sets HttpOnly auth and CSRF cookies on login, then revokes the token on logout", async () => {
    const login = await request(app).post("/api/auth/login").send({
      email: EMAIL,
      password: PASSWORD,
    });

    expect(login.status).toBe(200);
    const setCookies = (login.headers["set-cookie"] ?? []) as string[];
    const accessSetCookie =
      setCookies.find((cookie) => cookie.startsWith("rams_access_token=")) ??
      "";
    accessCookie = accessSetCookie.split(";")[0] ?? "";
    csrfCookie =
      setCookies
        .find((cookie) => cookie.startsWith("rams_csrf_token="))
        ?.split(";")[0] ?? "";
    expect(accessSetCookie).toContain("HttpOnly");
    expect(csrfCookie).toContain("rams_csrf_token=");
    expect(accessCookie).not.toBe("");

    const me = await request(app)
      .get("/api/auth/me")
      .set("Cookie", accessCookie);
    expect(me.status).toBe(200);

    const csrfRejected = await request(app)
      .post("/api/auth/logout")
      .set("Cookie", [accessCookie, csrfCookie]);
    expect(csrfRejected.status).toBe(403);

    const logout = await request(app)
      .post("/api/auth/logout")
      .set("Cookie", [accessCookie, csrfCookie])
      .set("X-CSRF-Token", csrfCookie.split("=")[1] ?? "");
    expect(logout.status).toBe(200);

    const reused = await request(app)
      .get("/api/auth/me")
      .set("Cookie", accessCookie);
    expect(reused.status).toBe(401);
  });
});
