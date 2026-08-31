import { beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import app from "../src/app.js";
import { connectDatabase } from "../src/config/database.js";
import {
  ensureTestUsers,
  signTestToken,
  TEST_ALUMNI_USER_ID,
} from "./auth-fixture.js";

describe("horizontal authorization boundaries", () => {
  beforeAll(async () => {
    await connectDatabase();
    await ensureTestUsers();
  });

  it("does not let an alumni read or modify another alumni profile", async () => {
    const token = signTestToken(TEST_ALUMNI_USER_ID, "ALUMNI");
    const otherProfileId = "507f1f77bcf86cd799439012";

    const read = await request(app)
      .get(`/api/alumni/${otherProfileId}`)
      .set("Cookie", `rams_access_token=${token}`);
    expect(read.status).toBe(403);

    const update = await request(app)
      .patch(`/api/alumni/${otherProfileId}`)
      .set("Cookie", `rams_access_token=${token}`)
      .send({ currentPosition: "attacker" });
    expect(update.status).toBe(403);

    const deleteAttempt = await request(app)
      .delete(`/api/alumni/${otherProfileId}`)
      .set("Cookie", `rams_access_token=${token}`);
    expect(deleteAttempt.status).toBe(404);
  });
});
