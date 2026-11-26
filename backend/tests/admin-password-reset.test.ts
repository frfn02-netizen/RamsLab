import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import bcrypt from "bcrypt";
import { ObjectId } from "mongodb";

import app from "../src/app.js";
import { connectDatabase } from "../src/config/database.js";
import { getUsersCollection } from "../src/modules/users/user.repository.js";
import { getAuthAuditCollection } from "../src/modules/auth/auth.audit.js";
import {
  ensurePasswordUser,
  ensureTestUsers,
  signTestToken,
  TEST_ADMIN_USER_ID,
  TEST_ALUMNI_USER_ID,
  TEST_DOSEN_USER_ID,
} from "./auth-fixture.js";

const TARGET_DOSEN_ID = "00000000000000000000d101";
const INACTIVE_ID = "00000000000000000000d102";
const ADMIN_TARGET_ID = "00000000000000000000d103";
const TARGET_EMAIL = "vitest.admin.reset.target@test.local";
const TARGET_PASSWORD = "target-password-123";
const INACTIVE_EMAIL = "vitest.admin.reset.inactive@test.local";
const ADMIN_TARGET_EMAIL = "vitest.admin.reset.admin2@test.local";

let adminToken: string;

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

beforeAll(async () => {
  await connectDatabase();
  await ensureTestUsers();
  await ensurePasswordUser({
    id: TARGET_DOSEN_ID,
    email: TARGET_EMAIL,
    password: TARGET_PASSWORD,
    role: "DOSEN",
    isActive: true,
    mustChangePassword: false,
  });
  await ensurePasswordUser({
    id: INACTIVE_ID,
    email: INACTIVE_EMAIL,
    password: TARGET_PASSWORD,
    role: "DOSEN",
    isActive: false,
    mustChangePassword: false,
  });
  await ensurePasswordUser({
    id: ADMIN_TARGET_ID,
    email: ADMIN_TARGET_EMAIL,
    password: TARGET_PASSWORD,
    role: "ADMIN",
    isActive: true,
    mustChangePassword: false,
  });
  await getAuthAuditCollection().deleteMany({
    targetUserId: {
      $in: [
        new ObjectId(TARGET_DOSEN_ID),
        new ObjectId(INACTIVE_ID),
        new ObjectId(ADMIN_TARGET_ID),
      ],
    },
  });
  adminToken = signTestToken(TEST_ADMIN_USER_ID, "ADMIN");
});

afterAll(async () => {
  await getUsersCollection().deleteMany({
    _id: {
      $in: [
        new ObjectId(TARGET_DOSEN_ID),
        new ObjectId(INACTIVE_ID),
        new ObjectId(ADMIN_TARGET_ID),
      ],
    },
  });
  await getAuthAuditCollection().deleteMany({
    targetUserId: {
      $in: [
        new ObjectId(TARGET_DOSEN_ID),
        new ObjectId(INACTIVE_ID),
        new ObjectId(ADMIN_TARGET_ID),
      ],
    },
  });
});

describe("admin password reset", () => {
  it("requires authentication", async () => {
    const response = await request(app).post(
      `/api/users/${TARGET_DOSEN_ID}/password-reset`,
    );
    expect(response.status).toBe(401);
  });

  it("rejects non-admin actors", async () => {
    for (const [userId, role] of [
      [TEST_DOSEN_USER_ID, "DOSEN"],
      [TEST_ALUMNI_USER_ID, "ALUMNI"],
    ] as const) {
      const token = signTestToken(userId, role);
      const response = await request(app)
        .post(`/api/users/${TARGET_DOSEN_ID}/password-reset`)
        .set("Cookie", `rams_access_token=${token}`);
      expect(response.status).toBe(403);
    }
  });

  it("returns 404 for an unknown target", async () => {
    const response = await request(app)
      .post("/api/users/00000000000000000000d1ff/password-reset")
      .set("Cookie", `rams_access_token=${adminToken}`);
    expect(response.status).toBe(404);
  });

  it("rejects resetting the admin's own password through this endpoint", async () => {
    const response = await request(app)
      .post(`/api/users/${TEST_ADMIN_USER_ID}/password-reset`)
      .set("Cookie", `rams_access_token=${adminToken}`);
    expect(response.status).toBe(400);
    expect(response.body.message).toMatch(/change password/i);
  });

  it("rejects an inactive target", async () => {
    const response = await request(app)
      .post(`/api/users/${INACTIVE_ID}/password-reset`)
      .set("Cookie", `rams_access_token=${adminToken}`);
    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Account is not active");
  });

  it("enforces CSRF for the admin reset mutation", async () => {
    const response = await request(app)
      .post(`/api/users/${TARGET_DOSEN_ID}/password-reset`)
      .set(
        "Cookie",
        `rams_access_token=${adminToken}; rams_csrf_token=csrf-cookie-value`,
      );
    expect(response.status).toBe(403);
    expect(response.body.message).toBe("CSRF validation failed");
  });

  it("refuses to reset another administrator account", async () => {
    const before = await getUsersCollection().findOne({
      _id: new ObjectId(ADMIN_TARGET_ID),
    });
    const response = await request(app)
      .post(`/api/users/${ADMIN_TARGET_ID}/password-reset`)
      .set("Cookie", `rams_access_token=${adminToken}`);

    expect(response.status).toBe(403);
    expect(response.body.message).toContain("Administrator accounts");

    const after = await getUsersCollection().findOne({
      _id: new ObjectId(ADMIN_TARGET_ID),
    });
    expect(after?.role).toBe("ADMIN");
    expect(after?.passwordHash).toBe(before?.passwordHash);
    expect(after?.tokenVersion).toBe(before?.tokenVersion);
  });

  it("resets the password, revokes old sessions, and forces a change", async () => {
    const before = await login(TARGET_EMAIL, TARGET_PASSWORD);
    expect(before.response.status).toBe(200);

    const response = await request(app)
      .post(`/api/users/${TARGET_DOSEN_ID}/password-reset`)
      .set("Cookie", `rams_access_token=${adminToken}`);

    expect(response.status).toBe(200);
    expect(response.headers["cache-control"]).toBe("no-store");
    expect(response.body.success).toBe(true);
    expect(response.body.data.email).toBe(TARGET_EMAIL);
    expect(response.body.data.role).toBe("DOSEN");
    expect(response.body.data.mustChangePassword).toBe(true);
    const temporaryPassword = response.body.data.temporaryPassword as string;
    expect(typeof temporaryPassword).toBe("string");
    expect(temporaryPassword.length).toBeGreaterThanOrEqual(12);

    const user = await getUsersCollection().findOne({
      _id: new ObjectId(TARGET_DOSEN_ID),
    });
    expect(user?.role).toBe("DOSEN");
    expect(user?.mustChangePassword).toBe(true);
    expect(user?.tokenVersion).toBe(1);
    expect(await bcrypt.compare(temporaryPassword, user!.passwordHash)).toBe(
      true,
    );

    const oldSession = await request(app)
      .get("/api/dosen")
      .set("Cookie", before.access);
    expect(oldSession.status).toBe(401);

    const tempLogin = await login(TARGET_EMAIL, temporaryPassword);
    expect(tempLogin.response.status).toBe(200);
    expect(tempLogin.response.body.user.mustChangePassword).toBe(true);

    const blocked = await request(app)
      .get("/api/dosen")
      .set("Cookie", tempLogin.access);
    expect(blocked.status).toBe(403);
    expect(blocked.body.code).toBe("PASSWORD_CHANGE_REQUIRED");

    const changed = await request(app)
      .post("/api/auth/change-password")
      .set("Cookie", [tempLogin.access, tempLogin.csrf])
      .set("X-CSRF-Token", tempLogin.csrfToken)
      .send({
        currentPassword: temporaryPassword,
        newPassword: "target-new-password-456",
      });
    expect(changed.status).toBe(200);
    expect(changed.body.reauthenticate).toBe(false);

    const setCookies = (changed.headers["set-cookie"] ?? []) as string[];
    const newAccess =
      setCookies
        .find((cookie) => cookie.startsWith("rams_access_token="))
        ?.split(";")[0] ?? "";
    expect(newAccess).not.toBe("");

    const allowed = await request(app)
      .get("/api/meetings")
      .set("Cookie", newAccess);
    expect(allowed.status).toBe(200);

    const oldTempSession = await request(app)
      .get("/api/meetings")
      .set("Cookie", tempLogin.access);
    expect(oldTempSession.status).toBe(401);

    const audit = await getAuthAuditCollection()
      .find({ targetUserId: new ObjectId(TARGET_DOSEN_ID) })
      .toArray();
    expect(audit.some((entry) => entry.action === "ADMIN_PASSWORD_RESET")).toBe(
      true,
    );
    expect(JSON.stringify(audit)).not.toContain(temporaryPassword);
  });
});
