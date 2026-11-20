import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import bcrypt from "bcrypt";
import { ObjectId } from "mongodb";

import app from "../src/app.js";
import { connectDatabase } from "../src/config/database.js";
import { getUsersCollection } from "../src/modules/users/user.repository.js";
import { ensurePasswordUser } from "./auth-fixture.js";

const USER_ID = "00000000000000000000d301";
const EMAIL = "vitest.concurrent.change@test.local";
const CURRENT_PASSWORD = "current-concurrent-123";
const NEXT_A = "next-concurrent-a-123";
const NEXT_B = "next-concurrent-b-123";

beforeAll(async () => {
  await connectDatabase();
  await ensurePasswordUser({
    id: USER_ID,
    email: EMAIL,
    password: CURRENT_PASSWORD,
    role: "DOSEN",
    isActive: true,
    mustChangePassword: false,
    tokenVersion: 0,
  });
});

afterAll(async () => {
  await getUsersCollection().deleteOne({ _id: new ObjectId(USER_ID) });
});

describe("concurrent password change", () => {
  it("allows only one of two concurrent changes with the same current password", async () => {
    const login = await request(app)
      .post("/api/auth/login")
      .send({ email: EMAIL, password: CURRENT_PASSWORD });
    expect(login.status).toBe(200);

    const cookies = (login.headers["set-cookie"] ?? []).map((cookie) =>
      cookie.split(";")[0],
    );
    const csrfCookie = cookies.find((cookie) =>
      cookie.startsWith("rams_csrf_token="),
    );
    const csrfToken = csrfCookie?.split("=")[1] ?? "";

    const [a, b] = await Promise.all([
      request(app)
        .post("/api/auth/change-password")
        .set("Cookie", cookies)
        .set("X-CSRF-Token", csrfToken)
        .send({ currentPassword: CURRENT_PASSWORD, newPassword: NEXT_A }),
      request(app)
        .post("/api/auth/change-password")
        .set("Cookie", cookies)
        .set("X-CSRF-Token", csrfToken)
        .send({ currentPassword: CURRENT_PASSWORD, newPassword: NEXT_B }),
    ]);

    const statuses = [a.status, b.status].sort((left, right) => left - right);
    expect(statuses.filter((status) => status === 200)).toHaveLength(1);
    expect([400, 409]).toContain(statuses[1]);

    const winnerPassword = a.status === 200 ? NEXT_A : NEXT_B;
    const loserPassword = a.status === 200 ? NEXT_B : NEXT_A;

    const user = await getUsersCollection().findOne({
      _id: new ObjectId(USER_ID),
    });
    expect(user?.tokenVersion).toBe(1);
    expect(await bcrypt.compare(winnerPassword, user!.passwordHash)).toBe(true);
    expect(await bcrypt.compare(loserPassword, user!.passwordHash)).toBe(false);

    const winnerResponse = a.status === 200 ? a : b;
    const winnerCookies = (
      winnerResponse.headers["set-cookie"] ?? []
    ) as string[];
    const newAccess =
      winnerCookies
        .find((cookie) => cookie.startsWith("rams_access_token="))
        ?.split(";")[0] ?? "";
    expect(newAccess).not.toBe("");

    const session = await request(app)
      .get("/api/auth/me")
      .set("Cookie", newAccess);
    expect(session.status).toBe(200);
  });
});
