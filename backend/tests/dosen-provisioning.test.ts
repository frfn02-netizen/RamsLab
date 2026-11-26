import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import bcrypt from "bcrypt";
import { ObjectId } from "mongodb";

import app from "../src/app.js";
import { connectDatabase } from "../src/config/database.js";
import { getDosenCollection } from "../src/modules/dosen/dosen.repository.js";
import { getUsersCollection } from "../src/modules/users/user.repository.js";
import { setMailjetTransportForTesting } from "../src/lib/mailjet.js";
import { ensureTestUsers, signTestToken, TEST_ADMIN_USER_ID } from "./auth-fixture.js";

const EMPLOYEE_PREFIX = "vitest-lecturer";
const EMAIL_PREFIX = "vitest.lecturer.";
const ENV_KEYS = [
  "MAILJET_API_KEY",
  "MAILJET_SECRET_KEY",
  "MAILJET_API_SECRET",
  "MAILJET_SENDER_EMAIL",
  "MAILJET_SENDER_NAME",
  "FRONTEND_URL",
] as const;
const originalEnv = Object.fromEntries(
  ENV_KEYS.map((key) => [key, process.env[key]]),
) as Record<(typeof ENV_KEYS)[number], string | undefined>;

let adminToken = "";
let tag = 0;

function nextTag() {
  tag += 1;
  return `${EMPLOYEE_PREFIX}-${Date.now()}-${tag}`;
}

function lecturerPayload(email: string, employeeId: string) {
  return {
    email,
    fullName: "Vitest Lecturer",
    employeeId,
    specialization: [],
  };
}

beforeAll(async () => {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is required for dosen provisioning tests");
  }
  await connectDatabase();
  await ensureTestUsers();
  adminToken = signTestToken(TEST_ADMIN_USER_ID, "ADMIN");
});

beforeEach(() => {
  process.env.MAILJET_API_KEY = "test-key";
  process.env.MAILJET_SECRET_KEY = "test-secret";
  delete process.env.MAILJET_API_SECRET;
  process.env.MAILJET_SENDER_EMAIL = "no-reply@rams.test";
  process.env.MAILJET_SENDER_NAME = "RAMS Platform";
  process.env.FRONTEND_URL = "https://rams.example";
});

afterEach(() => {
  for (const key of ENV_KEYS) {
    const value = originalEnv[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  setMailjetTransportForTesting(null);
  vi.unstubAllGlobals();
});

afterAll(async () => {
  await getDosenCollection().deleteMany({
    employeeId: { $regex: `^${EMPLOYEE_PREFIX}` },
  });
  await getUsersCollection().deleteMany({
    email: { $regex: `^${EMAIL_PREFIX.replace(/\./g, "\\.")}` },
  });
});

describe("Dosen provisioning", () => {
  it("creates the account and profile together and emails the login details", async () => {
    const employeeId = nextTag();
    const email = `${EMAIL_PREFIX}created@test.local`;
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ Messages: [{ Status: "success" }] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    setMailjetTransportForTesting(fetchMock);

    const response = await request(app)
      .post("/api/dosen")
      .set("Cookie", `rams_access_token=${adminToken}`)
      .send(lecturerPayload(email, employeeId));

    expect(response.status).toBe(201);
    expect(response.body.data.employeeId).toBe(employeeId);
    expect(response.body.data.isPublic).toBe(true);
    expect(response.body.notification).toEqual({ sent: true });
    expect(typeof response.body.temporaryPassword).toBe("string");

    const user = await getUsersCollection().findOne({ email });
    expect(user).not.toBeNull();
    expect(user?.role).toBe("DOSEN");
    expect(user?.isActive).toBe(true);
    expect(user?.mustChangePassword).toBe(true);
    expect(user?.tokenVersion).toBe(0);
    expect(
      await bcrypt.compare(
        response.body.temporaryPassword as string,
        user!.passwordHash,
      ),
    ).toBe(true);
    expect(response.body.data.userId).toBe(user?._id?.toString());

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.mailjet.com/v3.1/send");
    const payload = JSON.parse(String((init as RequestInit).body));
    const message = payload.Messages[0];
    expect(message.From.Email).toBe("no-reply@rams.test");
    expect(message.To[0].Email).toBe(email);
    expect(message.TextPart).toContain("https://rams.example/login");
    expect(message.TextPart).toContain(email);
    expect(message.TextPart).toContain(response.body.temporaryPassword);
    expect(message.HTMLPart).toContain("https://rams.example/login");
  });

  it("rolls back the auth account when the profile cannot be created", async () => {
    const employeeId = nextTag();
    const email = `${EMAIL_PREFIX}rollback@test.local`;
    const fetchMock = vi.fn();
    setMailjetTransportForTesting(fetchMock);

    const response = await request(app)
      .post("/api/dosen")
      .set("Cookie", `rams_access_token=${adminToken}`)
      .send({
        ...lecturerPayload(email, employeeId),
        publicationIds: ["000000000000000000000000"],
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("One or more publications do not exist");
    expect(await getUsersCollection().findOne({ email })).toBeNull();
    expect(
      await getDosenCollection().findOne({ employeeId }),
    ).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects a duplicate employeeId before creating an account", async () => {
    const employeeId = nextTag();
    const firstEmail = `${EMAIL_PREFIX}first@test.local`;
    const secondEmail = `${EMAIL_PREFIX}duplicate@test.local`;
    setMailjetTransportForTesting(
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ Messages: [{ Status: "success" }] }), {
          status: 200,
        }),
      ),
    );

    const first = await request(app)
      .post("/api/dosen")
      .set("Cookie", `rams_access_token=${adminToken}`)
      .send(lecturerPayload(firstEmail, employeeId));
    expect(first.status).toBe(201);

    const duplicate = await request(app)
      .post("/api/dosen")
      .set("Cookie", `rams_access_token=${adminToken}`)
      .send(lecturerPayload(secondEmail, employeeId));

    expect(duplicate.status).toBe(409);
    expect(await getUsersCollection().findOne({ email: secondEmail })).toBeNull();
  });

  it("keeps the account and reports a warning when the onboarding email fails", async () => {
    const employeeId = nextTag();
    const email = `${EMAIL_PREFIX}nofail@test.local`;
    setMailjetTransportForTesting(
      vi.fn().mockRejectedValue(new Error("network down")),
    );

    const response = await request(app)
      .post("/api/dosen")
      .set("Cookie", `rams_access_token=${adminToken}`)
      .send(lecturerPayload(email, employeeId));

    expect(response.status).toBe(201);
    expect(response.body.notification.sent).toBe(false);
    expect(typeof response.body.notification.warning).toBe("string");
    expect(await getUsersCollection().findOne({ email })).not.toBeNull();
    expect(await getDosenCollection().findOne({ employeeId })).not.toBeNull();
  });

  it("toggles login access without removing the profile", async () => {
    const employeeId = nextTag();
    const email = `${EMAIL_PREFIX}access@test.local`;
    setMailjetTransportForTesting(
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ Messages: [{ Status: "success" }] }), {
          status: 200,
        }),
      ),
    );

    const created = await request(app)
      .post("/api/dosen")
      .set("Cookie", `rams_access_token=${adminToken}`)
      .send(lecturerPayload(email, employeeId));
    expect(created.status).toBe(201);

    const dosenId = created.body.data._id as string;
    const userId = new ObjectId(created.body.data.userId as string);

    const disabled = await request(app)
      .patch(`/api/dosen/${dosenId}/access`)
      .set("Cookie", `rams_access_token=${adminToken}`)
      .send({ isActive: false });
    expect(disabled.status).toBe(200);
    expect(disabled.body.data.isActive).toBe(false);

    const deactivatedUser = await getUsersCollection().findOne({ _id: userId });
    expect(deactivatedUser?.isActive).toBe(false);
    expect(deactivatedUser?.tokenVersion).toBe(1);
    expect(await getDosenCollection().findOne({ employeeId })).not.toBeNull();

    const enabled = await request(app)
      .patch(`/api/dosen/${dosenId}/access`)
      .set("Cookie", `rams_access_token=${adminToken}`)
      .send({ isActive: true });
    expect(enabled.status).toBe(200);
    const reactivatedUser = await getUsersCollection().findOne({ _id: userId });
    expect(reactivatedUser?.isActive).toBe(true);
  });
});
