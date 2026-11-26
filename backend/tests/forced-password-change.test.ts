import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { ObjectId } from "mongodb";

import app from "../src/app.js";
import { connectDatabase } from "../src/config/database.js";
import { getUsersCollection } from "../src/modules/users/user.repository.js";
import {
  ensurePasswordUser,
  ensureTestUsers,
  signTestToken,
  TEST_ADMIN_USER_ID,
} from "./auth-fixture.js";

const USER_ID = "00000000000000000000d201";
const EMAIL = "vitest.forced.change@test.local";
const TEMP_PASSWORD = "temporary-password-123";
const NEW_PASSWORD = "new-password-456";

beforeAll(async () => {
  await connectDatabase();
  await ensureTestUsers();
  await ensurePasswordUser({
    id: USER_ID,
    email: EMAIL,
    password: TEMP_PASSWORD,
    role: "DOSEN",
    isActive: true,
    mustChangePassword: true,
    tokenVersion: 0,
  });
});

afterAll(async () => {
  await getUsersCollection().deleteOne({ _id: new ObjectId(USER_ID) });
});

describe("forced password change", () => {
  it("blocks protected endpoints until the password is changed", async () => {
    const login = await request(app).post("/api/auth/login").send({
      email: EMAIL,
      password: TEMP_PASSWORD,
    });
    expect(login.status).toBe(200);

    const setCookies = (login.headers["set-cookie"] ?? []) as string[];
    const access =
      setCookies
        .find((cookie) => cookie.startsWith("rams_access_token="))
        ?.split(";")[0] ?? "";
    const csrf =
      setCookies
        .find((cookie) => cookie.startsWith("rams_csrf_token="))
        ?.split(";")[0] ?? "";
    const csrfToken = csrf.split("=")[1] ?? "";
    expect(access).not.toBe("");

    const me = await request(app).get("/api/auth/me").set("Cookie", access);
    expect(me.status).toBe(200);
    expect(me.body.user.mustChangePassword).toBe(true);

    const meWithQuery = await request(app)
      .get("/api/auth/me?probe=1")
      .set("Cookie", access);
    expect(meWithQuery.status).toBe(200);

    const meWithTrailingSlash = await request(app)
      .get("/api/auth/me/")
      .set("Cookie", access);
    expect(meWithTrailingSlash.status).toBe(200);

    const meWithDifferentCase = await request(app)
      .get("/API/AUTH/ME")
      .set("Cookie", access);
    expect(meWithDifferentCase.status).toBe(200);

    const ambiguousPath = await request(app)
      .get("/api/auth/me/../dosen")
      .set("Cookie", access);
    expect([403, 404]).toContain(ambiguousPath.status);

    const csrfResponse = await request(app)
      .get("/api/auth/csrf")
      .set("Cookie", access);
    expect(csrfResponse.status).toBe(200);

    const blocked = await request(app).get("/api/dosen").set("Cookie", access);
    expect(blocked.status).toBe(403);
    expect(blocked.body.code).toBe("PASSWORD_CHANGE_REQUIRED");

    const changed = await request(app)
      .post("/api/auth/change-password")
      .set("Cookie", [access, csrf])
      .set("X-CSRF-Token", csrfToken)
      .send({ currentPassword: TEMP_PASSWORD, newPassword: NEW_PASSWORD });
    expect(changed.status).toBe(200);
    expect(changed.body.reauthenticate).toBe(false);

    const newCookies = (changed.headers["set-cookie"] ?? []) as string[];
    const newAccess =
      newCookies
        .find((cookie) => cookie.startsWith("rams_access_token="))
        ?.split(";")[0] ?? "";
    expect(newAccess).not.toBe("");

    const user = await getUsersCollection().findOne({
      _id: new ObjectId(USER_ID),
    });
    expect(user?.mustChangePassword).toBe(false);
    expect(user?.tokenVersion).toBe(1);

    const oldSession = await request(app)
      .get("/api/dosen")
      .set("Cookie", access);
    expect(oldSession.status).toBe(401);

    const newSession = await request(app)
      .get("/api/meetings")
      .set("Cookie", newAccess);
    expect(newSession.status).toBe(200);
  });

  it("keeps admin sessions usable when the admin token was issued normally", async () => {
    const adminToken = signTestToken(TEST_ADMIN_USER_ID, "ADMIN");
    const response = await request(app)
      .get("/api/admin/test")
      .set("Cookie", `rams_access_token=${adminToken}`);
    expect(response.status).toBe(200);
  });
});
