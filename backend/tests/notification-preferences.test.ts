import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { ObjectId } from "mongodb";
import request from "supertest";

import app from "../src/app.js";
import { connectDatabase } from "../src/config/database.js";
import {
  getUsersCollection,
  updateUserNotificationPreferences,
} from "../src/modules/users/user.repository.js";
import {
  ensureTestUsers,
  restoreUserFixtures,
  signTestToken,
  snapshotUserFixtures,
  TEST_DOSEN_USER_ID,
  type UserFixtureSnapshot,
} from "./auth-fixture.js";

let snapshots: UserFixtureSnapshot[] = [];
const token = () => signTestToken(TEST_DOSEN_USER_ID, "DOSEN");

beforeAll(async () => {
  await connectDatabase();
  await ensureTestUsers();
});

beforeEach(async () => {
  snapshots = await snapshotUserFixtures([TEST_DOSEN_USER_ID]);
  await getUsersCollection().updateOne(
    { _id: new ObjectId(TEST_DOSEN_USER_ID) },
    {
      $set: {
        whatsappNumber: null,
        whatsappOptIn: false,
        whatsappOptInAt: null,
      },
    },
  );
});

afterEach(async () => {
  await restoreUserFixtures(snapshots);
});

describe("notification preferences API", () => {
  it("requires authentication", async () => {
    const response = await request(app).get(
      "/api/users/me/notification-preferences",
    );
    expect(response.status).toBe(401);
  });

  it("returns empty defaults without exposing other account fields", async () => {
    const response = await request(app)
      .get("/api/users/me/notification-preferences")
      .set("Cookie", `rams_access_token=${token()}`);

    expect(response.status).toBe(200);
    expect(response.headers["cache-control"]).toBe("no-store");
    expect(response.body).toEqual({
      success: true,
      data: {
        whatsappNumber: null,
        whatsappOptIn: false,
        whatsappOptInAt: null,
      },
    });
  });

  it("stores an opted-in international number", async () => {
    const response = await request(app)
      .patch("/api/users/me/notification-preferences")
      .set("Cookie", `rams_access_token=${token()}`)
      .send({ whatsappNumber: "+6281234567890", whatsappOptIn: true });

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      whatsappNumber: "+6281234567890",
      whatsappOptIn: true,
    });
    expect(typeof response.body.data.whatsappOptInAt).toBe("string");
  });

  it("rejects a local number without explicit country context", async () => {
    const response = await request(app)
      .patch("/api/users/me/notification-preferences")
      .set("Cookie", `rams_access_token=${token()}`)
      .send({ whatsappNumber: "0812-3456-7890", whatsappOptIn: true });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  it("revokes consent without deleting the number", async () => {
    await request(app)
      .patch("/api/users/me/notification-preferences")
      .set("Cookie", `rams_access_token=${token()}`)
      .send({ whatsappNumber: "+6281234567890", whatsappOptIn: true });

    const response = await request(app)
      .patch("/api/users/me/notification-preferences")
      .set("Cookie", `rams_access_token=${token()}`)
      .send({ whatsappOptIn: false });

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual({
      whatsappNumber: "+6281234567890",
      whatsappOptIn: false,
      whatsappOptInAt: null,
    });
  });

  it("revokes consent when the number changes without explicit consent", async () => {
    await request(app)
      .patch("/api/users/me/notification-preferences")
      .set("Cookie", `rams_access_token=${token()}`)
      .send({ whatsappNumber: "+628111111111", whatsappOptIn: true });

    const response = await request(app)
      .patch("/api/users/me/notification-preferences")
      .set("Cookie", `rams_access_token=${token()}`)
      .send({ whatsappNumber: "+628222222222" });

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual({
      whatsappNumber: "+628222222222",
      whatsappOptIn: false,
      whatsappOptInAt: null,
    });
  });

  it("rejects consent without a number", async () => {
    const response = await request(app)
      .patch("/api/users/me/notification-preferences")
      .set("Cookie", `rams_access_token=${token()}`)
      .send({ whatsappNumber: null, whatsappOptIn: true });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  it("rejects invalid numbers without echoing the value", async () => {
    const response = await request(app)
      .patch("/api/users/me/notification-preferences")
      .set("Cookie", `rams_access_token=${token()}`)
      .send({ whatsappNumber: "8123456789", whatsappOptIn: true });

    expect(response.status).toBe(400);
    expect(JSON.stringify(response.body)).not.toContain("8123456789");
  });

  it("enforces the consent-number invariant on direct repository updates", async () => {
    const id = new ObjectId(TEST_DOSEN_USER_ID);
    const first = await updateUserNotificationPreferences(
      id,
      { whatsappNumber: "+628111111111", whatsappOptIn: true },
      new Date("2040-01-01T00:00:00.000Z"),
    );
    expect(first).toMatchObject({
      ok: true,
      value: {
        whatsappNumber: "+628111111111",
        whatsappOptIn: true,
        whatsappConsentNumber: "+628111111111",
      },
    });

    const changed = await updateUserNotificationPreferences(
      id,
      { whatsappNumber: "+628222222222" },
      new Date("2040-01-02T00:00:00.000Z"),
    );
    expect(changed).toMatchObject({
      ok: true,
      value: {
        whatsappNumber: "+628222222222",
        whatsappOptIn: false,
        whatsappOptInAt: null,
        whatsappConsentNumber: null,
      },
    });

    const reconsented = await updateUserNotificationPreferences(
      id,
      { whatsappNumber: "+628222222222", whatsappOptIn: true },
      new Date("2040-01-03T00:00:00.000Z"),
    );
    expect(reconsented).toMatchObject({
      ok: true,
      value: {
        whatsappNumber: "+628222222222",
        whatsappOptIn: true,
        whatsappConsentNumber: "+628222222222",
      },
    });

    const revoked = await updateUserNotificationPreferences(
      id,
      { whatsappOptIn: false },
      new Date("2040-01-04T00:00:00.000Z"),
    );
    expect(revoked).toMatchObject({
      ok: true,
      value: {
        whatsappOptIn: false,
        whatsappOptInAt: null,
        whatsappConsentNumber: null,
      },
    });
  });

  it("does not expose WhatsApp fields in the user directory or session", async () => {
    await request(app)
      .patch("/api/users/me/notification-preferences")
      .set("Cookie", `rams_access_token=${token()}`)
      .send({ whatsappNumber: "+6281234567890", whatsappOptIn: true });

    const directory = await request(app)
      .get("/api/users/directory")
      .set("Cookie", `rams_access_token=${token()}`);
    expect(directory.status).toBe(200);
    expect(JSON.stringify(directory.body)).not.toContain("whatsapp");
    expect(JSON.stringify(directory.body)).not.toContain("+6281234567890");

    const session = await request(app)
      .get("/api/auth/me")
      .set("Cookie", `rams_access_token=${token()}`);
    expect(session.status).toBe(200);
    expect(JSON.stringify(session.body)).not.toContain("whatsapp");
    expect(JSON.stringify(session.body)).not.toContain("+6281234567890");
  });
});
