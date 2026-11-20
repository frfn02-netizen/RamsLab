import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";

import app from "../src/app.js";
import { connectDatabase } from "../src/config/database.js";
import { getUsersCollection } from "../src/modules/users/user.repository.js";
import {
  ensureTestUsers,
  signTestToken,
  TEST_ADMIN_USER_ID,
  TEST_DOSEN_USER_ID,
} from "./auth-fixture.js";

const TEMP_EMAIL = "vitest.provisioned.dosen@test.local";
const TEMP_STUDENT_EMAIL = "vitest.provisioned.student@test.local";

async function cleanup() {
  await getUsersCollection().deleteMany({
    email: { $in: [TEMP_EMAIL, TEMP_STUDENT_EMAIL] },
  });
}

beforeAll(async () => {
  await connectDatabase();
  await ensureTestUsers();
  await cleanup();
});

afterAll(async () => {
  await cleanup();
});

describe("dosen account provisioning", () => {
  it("requires admin authentication", async () => {
    const unauthenticated = await request(app)
      .post("/api/users/dosen")
      .send({ email: TEMP_EMAIL });
    expect(unauthenticated.status).toBe(401);

    const dosenToken = signTestToken(TEST_DOSEN_USER_ID, "DOSEN");
    const forbidden = await request(app)
      .post("/api/users/dosen")
      .set("Cookie", `rams_access_token=${dosenToken}`)
      .send({ email: TEMP_EMAIL });
    expect(forbidden.status).toBe(403);
  });

  it("generates a one-time temporary password and forces a change", async () => {
    const adminToken = signTestToken(TEST_ADMIN_USER_ID, "ADMIN");
    const response = await request(app)
      .post("/api/users/dosen")
      .set("Cookie", `rams_access_token=${adminToken}`)
      .send({ email: TEMP_EMAIL });

    expect(response.status).toBe(201);
    expect(response.headers["cache-control"]).toBe("no-store");
    expect(response.body.success).toBe(true);
    expect(typeof response.body.data.temporaryPassword).toBe("string");
    expect(response.body.data.temporaryPassword.length).toBeGreaterThanOrEqual(
      12,
    );

    const user = await getUsersCollection().findOne({ email: TEMP_EMAIL });
    expect(user?.role).toBe("DOSEN");
    expect(user?.mustChangePassword).toBe(true);
    expect(user?.tokenVersion).toBe(0);

    const login = await request(app)
      .post("/api/auth/login")
      .send({
        email: TEMP_EMAIL,
        password: response.body.data.temporaryPassword,
      });
    expect(login.status).toBe(200);
    expect(login.body.user.mustChangePassword).toBe(true);

    const cookies = (login.headers["set-cookie"] ?? []).map((cookie) =>
      cookie.split(";")[0],
    );
    const blocked = await request(app)
      .get("/api/dosen")
      .set("Cookie", cookies);
    expect(blocked.status).toBe(403);
    expect(blocked.body.code).toBe("PASSWORD_CHANGE_REQUIRED");

    const duplicate = await request(app)
      .post("/api/users/dosen")
      .set("Cookie", `rams_access_token=${adminToken}`)
      .send({ email: TEMP_EMAIL });
    expect(duplicate.status).toBe(409);
    expect(duplicate.headers["cache-control"]).toBe("no-store");
    expect(duplicate.body.message).toBe("Email is already registered");
  });
});

describe("student schedule account provisioning", () => {
  it("creates a student with explicit schedule portal access and a temporary password", async () => {
    const adminToken = signTestToken(TEST_ADMIN_USER_ID, "ADMIN");
    const response = await request(app)
      .post("/api/users/student")
      .set("Cookie", `rams_access_token=${adminToken}`)
      .send({
        email: TEMP_STUDENT_EMAIL,
        displayName: "Vitest Schedule Student",
        schedulePortalAccess: true,
      });

    expect(response.status).toBe(201);
    expect(response.headers["cache-control"]).toBe("no-store");
    expect(response.body.data.role).toBe("STUDENT");
    expect(response.body.data.permissions).toContain("schedule.portal.access");
    expect(response.body.data.mustChangePassword).toBe(true);
    expect(typeof response.body.data.temporaryPassword).toBe("string");

    const user = await getUsersCollection().findOne({
      email: TEMP_STUDENT_EMAIL,
    });
    expect(user?.role).toBe("STUDENT");
    expect(user?.displayName).toBe("Vitest Schedule Student");
    expect(user?.permissions).toContain("schedule.portal.access");

    const login = await request(app).post("/api/auth/login").send({
      email: TEMP_STUDENT_EMAIL,
      password: response.body.data.temporaryPassword,
    });
    expect(login.status).toBe(200);
    expect(login.body.user.role).toBe("STUDENT");
    expect(login.body.user.permissions).toContain("schedule.portal.access");
  });

  it("grants and revokes schedule access without changing the student role", async () => {
    const adminToken = signTestToken(TEST_ADMIN_USER_ID, "ADMIN");
    const user = await getUsersCollection().findOne({
      email: TEMP_STUDENT_EMAIL,
    });
    expect(user?._id).toBeTruthy();

    const revoke = await request(app)
      .patch(`/api/users/${user!._id!.toString()}/schedule-access`)
      .set("Cookie", `rams_access_token=${adminToken}`)
      .send({ enabled: false });
    expect(revoke.status).toBe(200);
    expect(revoke.body.data.permissions).not.toContain("schedule.portal.access");

    const grant = await request(app)
      .patch(`/api/users/${user!._id!.toString()}/schedule-access`)
      .set("Cookie", `rams_access_token=${adminToken}`)
      .send({ enabled: true });
    expect(grant.status).toBe(200);
    expect(grant.body.data.permissions).toContain("schedule.portal.access");
    expect(grant.body.data.role).toBe("STUDENT");
  });

  it("rejects duplicate student account creation", async () => {
    const adminToken = signTestToken(TEST_ADMIN_USER_ID, "ADMIN");
    const duplicate = await request(app)
      .post("/api/users/student")
      .set("Cookie", `rams_access_token=${adminToken}`)
      .send({
        email: TEMP_STUDENT_EMAIL,
        schedulePortalAccess: true,
      });

    expect(duplicate.status).toBe(409);
    expect(duplicate.body.message).toBe("Email is already registered");
  });
});
