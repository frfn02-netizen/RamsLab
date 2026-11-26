import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import bcrypt from "bcrypt";
import { ObjectId } from "mongodb";

import app from "../src/app.js";
import { connectDatabase } from "../src/config/database.js";
import { getDosenCollection } from "../src/modules/dosen/dosen.repository.js";
import { getUsersCollection } from "../src/modules/users/user.repository.js";
import { ensureTestUsers, signTestToken, TEST_ADMIN_USER_ID, TEST_DOSEN_USER_ID } from "./auth-fixture.js";

const EMAIL_PREFIX = "vitest.internal.";
let tag = 0;

function nextEmail(label: string) {
  tag += 1;
  return `${EMAIL_PREFIX}${label}.${Date.now()}.${tag}@test.local`;
}

let adminToken = "";
let dosenToken = "";

beforeAll(async () => {
  await connectDatabase();
  await ensureTestUsers();
  adminToken = signTestToken(TEST_ADMIN_USER_ID, "ADMIN");
  dosenToken = signTestToken(TEST_DOSEN_USER_ID, "DOSEN");
});

afterAll(async () => {
  await getUsersCollection().deleteMany({ email: { $regex: `^${EMAIL_PREFIX}` } });
});

describe("internal account provisioning", () => {
  it("creates an internal DOSEN account without a public lecturer profile", async () => {
    const email = nextEmail("dosen");

    const response = await request(app)
      .post("/api/users/internal")
      .set("Cookie", `rams_access_token=${adminToken}`)
      .send({ fullName: "Internal Dosen", email, role: "DOSEN" });

    expect(response.status).toBe(201);
    expect(response.body.data).toMatchObject({
      email,
      displayName: "Internal Dosen",
      role: "DOSEN",
      isActive: true,
      mustChangePassword: true,
    });
    expect(typeof response.body.data.temporaryPassword).toBe("string");

    const user = await getUsersCollection().findOne({ email });
    expect(user).not.toBeNull();
    expect(user?.role).toBe("DOSEN");
    expect(user?.displayName).toBe("Internal Dosen");
    expect(user?.mustChangePassword).toBe(true);
    expect(
      await bcrypt.compare(
        response.body.data.temporaryPassword as string,
        user!.passwordHash,
      ),
    ).toBe(true);

    expect(await getDosenCollection().findOne({ userId: new ObjectId(user!._id) })).toBeNull();
  });

  it("creates an ADMIN account", async () => {
    const email = nextEmail("admin");

    const response = await request(app)
      .post("/api/users/internal")
      .set("Cookie", `rams_access_token=${adminToken}`)
      .send({ fullName: "Internal Admin", email, role: "ADMIN" });

    expect(response.status).toBe(201);
    expect(response.body.data.role).toBe("ADMIN");
    expect((await getUsersCollection().findOne({ email }))?.role).toBe("ADMIN");
  });

  it("rejects a public role or missing fields", async () => {
    const email = nextEmail("invalid");
    const response = await request(app)
      .post("/api/users/internal")
      .set("Cookie", `rams_access_token=${adminToken}`)
      .send({ fullName: "Not Allowed", email, role: "ALUMNI" });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  it("rejects a duplicate email", async () => {
    const email = nextEmail("duplicate");
    await getUsersCollection().insertOne({
      email,
      passwordHash: "unused",
      role: "DOSEN",
      isActive: true,
      lastLoginAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const response = await request(app)
      .post("/api/users/internal")
      .set("Cookie", `rams_access_token=${adminToken}`)
      .send({ fullName: "Duplicate", email, role: "DOSEN" });

    expect(response.status).toBe(409);
    expect(response.body.success).toBe(false);
  });

  it("rejects non-admin and unauthenticated callers", async () => {
    const forbidden = await request(app)
      .post("/api/users/internal")
      .set("Cookie", `rams_access_token=${dosenToken}`)
      .send({
        fullName: "Nope",
        email: nextEmail("forbidden"),
        role: "DOSEN",
      });
    expect(forbidden.status).toBe(403);

    const unauthenticated = await request(app)
      .post("/api/users/internal")
      .send({ fullName: "Nope", email: nextEmail("anon"), role: "DOSEN" });
    expect(unauthenticated.status).toBe(401);
  });
});
