import { beforeAll, afterAll, describe, expect, it } from "vitest";

import request from "supertest";
import jwt from "jsonwebtoken";
import { ObjectId } from "mongodb";

import app from "../src/app.js";

import { connectDatabase } from "../src/config/database.js";

import { getAlumniCollection } from "../src/modules/alumni/alumni.repository.js";
import { createAlumniShell } from "../src/modules/alumni/alumni.service.js";
import { createAlumniUser } from "../src/modules/users/user.service.js";

import { getUsersCollection } from "../src/modules/users/user.repository.js";
import {
  ensureTestUsers,
  signTestToken,
  TEST_ADMIN_USER_ID,
} from "./auth-fixture.js";

const TEST_USER_ID = new ObjectId().toHexString();

const TEST_NIM = "VITEST-ALUMNI-001";

const TEST_FULL_NAME = "Vitest Alumni";

const TEST_USER_EMAIL = "vitest.alumni@test.local";

let adminToken: string;
let alumniToken: string;
let alumniId: string;

beforeAll(async () => {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET is required for alumni tests");
  }

  await connectDatabase();
  await ensureTestUsers();

  const users = getUsersCollection();

  await users.deleteMany({
    email: TEST_USER_EMAIL,
  });

  await users.insertOne({
    _id: new ObjectId(TEST_USER_ID),
    email: TEST_USER_EMAIL,
    passwordHash: "vitest-test-password",
    role: "ALUMNI",
    isActive: true,
    lastLoginAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const alumniCollection = getAlumniCollection();

  await alumniCollection.deleteMany({
    nim: TEST_NIM,
  });

  const alumniDoc = {
    userId: new ObjectId(TEST_USER_ID),
    fullName: TEST_FULL_NAME,
    nim: TEST_NIM,
    angkatan: 26,
    program: "Informatics Engineering",
    photo: "https://example.com/vitest-alumni.jpg",
    phone: "081234567890",
    location: "Surabaya",
    currentStatus: "WORKING",
    currentCompany: "Vitest Company",
    currentPosition: "Software Engineer",
    linkedin: "https://www.linkedin.com/in/vitest-alumni",
    bio: "Alumni created for automated testing.",
    careerHistory: [],
    educationHistory: [],
    isPublic: false,
    reviewStatus: "PENDING",
    profileCompleted: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const inserted = await alumniCollection.insertOne(alumniDoc);
  alumniId = inserted.insertedId.toString();

  adminToken = signTestToken(TEST_ADMIN_USER_ID, "ADMIN");

  alumniToken = jwt.sign(
    {
      userId: TEST_USER_ID,
      role: "ALUMNI",
    },
    secret,
    {
      expiresIn: "1h",
      issuer: "rams-platform-api",
    },
  );
});

afterAll(async () => {
  const alumniCollection = getAlumniCollection();

  await alumniCollection.deleteMany({
    nim: TEST_NIM,
  });

  const users = getUsersCollection();

  await users.deleteOne({
    _id: new ObjectId(TEST_USER_ID),
  });
});

describe("Alumni API", () => {
  it("no longer exposes the admin create endpoints", async () => {
    const legacyCreate = await request(app)
      .post("/api/alumni")
      .set("Cookie", `rams_access_token=${adminToken}`)
      .send({});

    expect(legacyCreate.status).toBe(404);

    const legacyAccount = await request(app)
      .post("/api/alumni/admin")
      .set("Cookie", `rams_access_token=${adminToken}`)
      .send({
        email: "legacy.admin.alumni@test.local",
        password: "LegacyPass1!",
      });

    expect(legacyAccount.status).toBe(404);

    const legacyUser = await request(app)
      .post("/api/users/alumni")
      .set("Cookie", `rams_access_token=${adminToken}`)
      .send({
        email: "legacy.admin.alumni@test.local",
        password: "LegacyPass1!",
      });

    expect(legacyUser.status).toBe(404);
  });

  it("still supports alumni self-registration and first login", async () => {
    const email = `vitest.register.${Date.now()}@test.local`;
    const password = "VitestRegister1!";

    const registered = await request(app).post("/api/auth/register").send({
      fullName: "Register Alumni",
      email,
      password,
      confirmPassword: password,
    });

    expect(registered.status).toBe(201);

    const userId = new ObjectId(registered.body.user.id as string);

    const shells = await getAlumniCollection().find({ userId }).toArray();

    expect(shells).toHaveLength(1);
    expect(shells[0]?.reviewStatus).toBe("PENDING");
    expect(shells[0]?.isPublic).toBe(false);

    const login = await request(app).post("/api/auth/login").send({
      email,
      password,
    });

    expect(login.status).toBe(200);
    expect(login.body.success).toBe(true);
    expect(login.body.user.id).toBe(userId.toHexString());

    await getAlumniCollection().deleteMany({ userId });
    await getUsersCollection().deleteOne({ _id: userId });
  });

  it("should get alumni list", async () => {
    const response = await request(app)
      .get("/api/alumni")
      .set("Cookie", `rams_access_token=${adminToken}`)
      .query({
        page: 1,
        limit: 10,
      });

    expect(response.status).toBe(200);

    expect(response.body.success).toBe(true);

    expect(Array.isArray(response.body.data)).toBe(true);

    expect(
      response.body.data.some((alumni: any) => alumni.nim === TEST_NIM),
    ).toBe(true);

    expect(response.body.pagination.total).toBeGreaterThan(0);
  });

  it("should search alumni by NIM", async () => {
    const response = await request(app)
      .get("/api/alumni")
      .set("Cookie", `rams_access_token=${adminToken}`)
      .query({
        search: TEST_NIM,
      });

    expect(response.status).toBe(200);

    expect(response.body.success).toBe(true);

    expect(response.body.data.length).toBeGreaterThan(0);

    expect(
      response.body.data.some((alumni: any) => alumni.nim === TEST_NIM),
    ).toBe(true);
  });

  it("should get alumni by id", async () => {
    const response = await request(app)
      .get(`/api/alumni/${alumniId}`)
      .set("Cookie", `rams_access_token=${adminToken}`);

    expect(response.status).toBe(200);

    expect(response.body.success).toBe(true);

    expect(response.body.data._id).toBe(alumniId);

    expect(response.body.data.nim).toBe(TEST_NIM);
  });

  it("should get alumni by current user", async () => {
    const response = await request(app)
      .get("/api/alumni/me")
      .set("Cookie", `rams_access_token=${alumniToken}`);

    expect(response.status).toBe(200);

    expect(response.body.success).toBe(true);

    expect(response.body.data.userId).toBe(TEST_USER_ID);
  });

  it("should reject invalid alumni id", async () => {
    const response = await request(app)
      .get("/api/alumni/invalid-id")
      .set("Cookie", `rams_access_token=${adminToken}`);

    expect(response.status).toBe(404);

    expect(response.body.success).toBe(false);
  });

  it("should reject invalid pagination page", async () => {
    const response = await request(app)
      .get("/api/alumni")
      .set("Cookie", `rams_access_token=${adminToken}`)
      .query({
        page: 0,
        limit: 10,
      });

    expect(response.status).toBe(400);

    expect(response.body.message).toBe("Page must be a positive integer");
  });

  it("should reject invalid pagination limit", async () => {
    const response = await request(app)
      .get("/api/alumni")
      .set("Cookie", `rams_access_token=${adminToken}`)
      .query({
        page: 1,
        limit: 0,
      });

    expect(response.status).toBe(400);

    expect(response.body.message).toBe("Limit must be a positive integer");
  });

  it("should update my alumni profile", async () => {
    const response = await request(app)
      .patch("/api/alumni/me")
      .set("Cookie", `rams_access_token=${alumniToken}`)
      .send({
        currentPosition: "Senior Software Engineer",
        location: "Jakarta",
      });

    expect(response.status).toBe(200);

    expect(response.body.success).toBe(true);

    expect(response.body.data.currentPosition).toBe("Senior Software Engineer");

    expect(response.body.data.location).toBe("Jakarta");
  });

  it("does not publish a pending profile even when an alumni sends isPublic true", async () => {
    const update = await request(app)
      .patch("/api/alumni/me")
      .set("Cookie", `rams_access_token=${alumniToken}`)
      .send({ isPublic: true });

    expect(update.status).toBe(200);
    expect(update.body.data.reviewStatus).toBe("PENDING");

    const publicList = await request(app).get("/api/public/alumni");
    expect(publicList.status).toBe(200);
    expect(
      publicList.body.data.some(
        (alumni: { id: string }) => alumni.id === alumniId,
      ),
    ).toBe(false);
  });

  it("allows an admin to approve and publish a completed alumni profile", async () => {
    const review = await request(app)
      .patch(`/api/alumni/${alumniId}/review`)
      .set("Cookie", `rams_access_token=${adminToken}`)
      .send({ action: "APPROVE" });

    expect(review.status).toBe(200);
    expect(review.body.data.reviewStatus).toBe("APPROVED");
    expect(review.body.data.isPublic).toBe(true);

    const publicList = await request(app).get("/api/public/alumni");
    expect(
      publicList.body.data.some(
        (alumni: { id: string }) => alumni.id === alumniId,
      ),
    ).toBe(true);

    const publicDetail = await request(app).get(
      `/api/public/alumni/${alumniId}`,
    );
    expect(publicDetail.status).toBe(200);
    expect(publicDetail.body.data.category).toBe("ALUMNI");
  });

  it("removes a rejected alumni from public list and detail responses", async () => {
    const review = await request(app)
      .patch(`/api/alumni/${alumniId}/review`)
      .set("Cookie", `rams_access_token=${adminToken}`)
      .send({ action: "REJECT", reason: "Profile is not publishable yet." });

    expect(review.status).toBe(200);
    expect(review.body.data.reviewStatus).toBe("REJECTED");
    expect(review.body.data.reviewNote).toBe("Profile is not publishable yet.");
    expect(review.body.data.isPublic).toBe(false);

    expect(
      (await request(app).get("/api/public/alumni")).body.data.some(
        (alumni: { id: string }) => alumni.id === alumniId,
      ),
    ).toBe(false);
    expect(
      (await request(app).get(`/api/public/alumni/${alumniId}`)).status,
    ).toBe(404);
  });

  it("should update alumni as admin", async () => {
    const response = await request(app)
      .patch(`/api/alumni/${alumniId}`)
      .set("Cookie", `rams_access_token=${adminToken}`)
      .send({
        currentCompany: "Updated Vitest Company",
      });

    expect(response.status).toBe(200);

    expect(response.body.success).toBe(true);

    expect(response.body.data.currentCompany).toBe("Updated Vitest Company");
  });
});

it("should reject modification of immutable alumni fields", async () => {
  const response = await request(app)
    .patch("/api/alumni/me")
    .set("Cookie", `rams_access_token=${alumniToken}`)
    .send({
      nim: "MALICIOUS-NIM-999",
      userId: new ObjectId().toHexString(),
    });

  expect(response.status).toBe(200);

  expect(response.body.success).toBe(true);

  expect(response.body.data.nim).toBe(TEST_NIM);

  expect(response.body.data.userId).toBe(TEST_USER_ID);
});

it("should not allow alumni to modify academic identity fields", async () => {
  const response = await request(app)
    .patch("/api/alumni/me")
    .set("Cookie", `rams_access_token=${alumniToken}`)
    .send({
      nim: "MALICIOUS-NIM-999",
      angkatan: 99,
      program: "Unauthorized Program",
    });

  expect(response.status).toBe(200);

  expect(response.body.success).toBe(true);

  expect(response.body.data.nim).toBe(TEST_NIM);

  expect(response.body.data.angkatan).not.toBe(99);

  expect(response.body.data.program).not.toBe("Unauthorized Program");
});

it("should not allow alumni to modify immutable fields", async () => {
  const response = await request(app)
    .patch("/api/alumni/me")
    .set("Cookie", `rams_access_token=${alumniToken}`)
    .send({
      nim: "ATTACKED-NIM",
      userId: new ObjectId().toHexString(),
      createdAt: "2000-01-01T00:00:00.000Z",
      updatedAt: "2000-01-01T00:00:00.000Z",
      currentPosition: "Security Test Engineer",
    });

  expect(response.status).toBe(200);

  expect(response.body.success).toBe(true);

  expect(response.body.data.nim).toBe(TEST_NIM);

  expect(response.body.data.userId).toBe(TEST_USER_ID);

  expect(response.body.data.currentPosition).toBe("Security Test Engineer");
});

it("should delete alumni as admin", async () => {
  const response = await request(app)
    .delete(`/api/alumni/${alumniId}`)
    .set("Cookie", `rams_access_token=${adminToken}`);

  expect(response.status).toBe(200);
  expect(response.body.success).toBe(true);
  expect(response.body.message).toBe("Alumni deleted successfully");

  const deleted = await getAlumniCollection().findOne({
    _id: new ObjectId(alumniId),
  });
  expect(deleted).toBeNull();

  const account = await getUsersCollection().findOne({
    _id: new ObjectId(TEST_USER_ID),
  });
  expect(account?.isActive).toBe(false);
  expect(account?.tokenVersion).toBeGreaterThan(0);
});

// ============================================================
// Review workflow: save → pending → approve / reject → re-review
// ============================================================

const workflowEmails: string[] = [];
const workflowAlumniIds: string[] = [];
let workflowSequence = 0;

async function createWorkflowAlumni() {
  workflowSequence += 1;
  const email = `vitest.workflow.${workflowSequence}.${Date.now()}@test.local`;
  workflowEmails.push(email);

  const user = await createAlumniUser({ email, password: "VitestWorkflow1!" });
  const alumni = await createAlumniShell(user.id);

  const createdAlumniId = alumni._id.toString();
  workflowAlumniIds.push(createdAlumniId);

  return {
    alumniId: createdAlumniId,
    token: signTestToken(user.id, "ALUMNI"),
  };
}

function saveProfile(token: string, payload: Record<string, unknown>) {
  return request(app)
    .patch("/api/alumni/me")
    .set("Cookie", `rams_access_token=${token}`)
    .send(payload);
}

function readProfile(token: string) {
  return request(app)
    .get("/api/alumni/me")
    .set("Cookie", `rams_access_token=${token}`);
}

async function completeProfile(
  token: string,
  overrides: Record<string, unknown> = {},
) {
  const sequence = workflowSequence;
  const response = await saveProfile(token, {
    fullName: "Workflow Alumni",
    nim: `WF-${sequence}`,
    angkatan: 34,
    program: "Naval Architecture",
    photo: `https://example.com/workflow-${sequence}.jpg`,
    ...overrides,
  });
  expect(response.status).toBe(200);
  return response;
}

function approveProfile(id: string) {
  return request(app)
    .patch(`/api/alumni/${id}/review`)
    .set("Cookie", `rams_access_token=${adminToken}`)
    .send({ action: "APPROVE" });
}

function rejectProfile(id: string, reason = "Please complete your profile.") {
  return request(app)
    .patch(`/api/alumni/${id}/review`)
    .set("Cookie", `rams_access_token=${adminToken}`)
    .send({ action: "REJECT", reason });
}

function isPublicAlumni(id: string) {
  return request(app)
    .get("/api/public/alumni")
    .then((response) =>
      (response.body.data as Array<{ id: string }>).some(
        (alumni) => alumni.id === id,
      ),
    );
}

afterAll(async () => {
  await getAlumniCollection().deleteMany({
    _id: { $in: workflowAlumniIds.map((id) => new ObjectId(id)) },
  });
  await getUsersCollection().deleteMany({
    email: { $in: workflowEmails },
  });
});

describe("alumni review workflow", () => {
  it("stores the batch number the alumni typed and returns it when the form is reopened", async () => {
    const { token } = await createWorkflowAlumni();

    const saved = await completeProfile(token, { angkatan: 34 });
    expect(saved.body.data.angkatan).toBe(34);
    expect(saved.body.data.profileCompleted).toBe(true);

    const reopened = await readProfile(token);
    expect(reopened.status).toBe(200);
    expect(reopened.body.data.angkatan).toBe(34);
    expect(reopened.body.data.program).toBe("Naval Architecture");

    // Saving again without touching the batch number must keep it.
    const savedAgain = await saveProfile(token, { bio: "Still here" });
    expect(savedAgain.status).toBe(200);
    expect(savedAgain.body.data.angkatan).toBe(34);

    const reopenedAgain = await readProfile(token);
    expect(reopenedAgain.body.data.angkatan).toBe(34);
  });

  it("lets an alumni claim academic identity once and never overwrite it", async () => {
    const { token } = await createWorkflowAlumni();

    await completeProfile(token, {
      angkatan: 21,
      program: "Informatics Engineering",
    });

    const tampered = await saveProfile(token, {
      angkatan: 99,
      program: "Someone Else's Program",
      nim: "REPLACED-NIM",
    });

    expect(tampered.status).toBe(200);
    expect(tampered.body.data.angkatan).toBe(21);
    expect(tampered.body.data.program).toBe("Informatics Engineering");
    expect(tampered.body.data.nim).toBe(`WF-${workflowSequence}`);
  });

  it("approves and publishes an incomplete profile", async () => {
    const { alumniId, token } = await createWorkflowAlumni();

    const saved = await saveProfile(token, {
      fullName: "Missing Photo Alumni",
      nim: `WF-PHOTO-${workflowSequence}`,
      angkatan: 30,
      program: "Ocean Engineering",
    });

    expect(saved.status).toBe(200);
    // Completeness stays informational: it must not gate the approval.
    expect(saved.body.data.profileCompleted).toBe(false);

    const review = await approveProfile(alumniId);

    expect(review.status).toBe(200);
    expect(review.body.data.reviewStatus).toBe("APPROVED");
    expect(review.body.data.isPublic).toBe(true);
    expect(review.body.data.profileCompleted).toBe(false);
    expect(await isPublicAlumni(alumniId)).toBe(true);

    const detail = await request(app).get(`/api/public/alumni/${alumniId}`);
    expect(detail.status).toBe(200);
    expect(detail.body.data.fullName).toBe("Missing Photo Alumni");
  });

  it("approves and publishes a complete profile", async () => {
    const { alumniId, token } = await createWorkflowAlumni();
    await completeProfile(token);

    const review = await approveProfile(alumniId);

    expect(review.status).toBe(200);
    expect(review.body.data.reviewStatus).toBe("APPROVED");
    expect(review.body.data.isPublic).toBe(true);
    expect(await isPublicAlumni(alumniId)).toBe(true);

    const detail = await request(app).get(`/api/public/alumni/${alumniId}`);
    expect(detail.status).toBe(200);
  });

  it("moves an approved profile back to pending when the alumni edits it", async () => {
    const { alumniId, token } = await createWorkflowAlumni();
    await completeProfile(token);
    expect((await approveProfile(alumniId)).status).toBe(200);

    const edited = await saveProfile(token, {
      bio: "Edited after approval",
    });

    expect(edited.status).toBe(200);
    expect(edited.body.data.reviewStatus).toBe("PENDING");
    expect(edited.body.data.isPublic).toBe(false);
    expect(await isPublicAlumni(alumniId)).toBe(false);

    const detail = await request(app).get(`/api/public/alumni/${alumniId}`);
    expect(detail.status).toBe(404);
  });

  it("moves a rejected profile back to pending when the alumni edits it", async () => {
    const { alumniId, token } = await createWorkflowAlumni();
    await completeProfile(token);
    expect((await rejectProfile(alumniId)).status).toBe(200);

    const fixed = await saveProfile(token, {
      bio: "Corrected after rejection",
    });

    expect(fixed.status).toBe(200);
    expect(fixed.body.data.reviewStatus).toBe("PENDING");
    expect(fixed.body.data.isPublic).toBe(false);

    const approvedAgain = await approveProfile(alumniId);
    expect(approvedAgain.status).toBe(200);
    expect(approvedAgain.body.data.reviewStatus).toBe("APPROVED");
    expect(approvedAgain.body.data.isPublic).toBe(true);
  });

  it("keeps a pending profile pending when the alumni saves it", async () => {
    const { alumniId, token } = await createWorkflowAlumni();
    await completeProfile(token);

    const saved = await saveProfile(token, { bio: "Still awaiting review" });

    expect(saved.status).toBe(200);
    expect(saved.body.data.reviewStatus).toBe("PENDING");
    expect(saved.body.data.isPublic).toBe(false);
    expect(await isPublicAlumni(alumniId)).toBe(false);
  });

  it("keeps an approved profile approved when the alumni only toggles visibility", async () => {
    const { alumniId, token } = await createWorkflowAlumni();
    await completeProfile(token);
    expect((await approveProfile(alumniId)).status).toBe(200);

    const hidden = await saveProfile(token, { isPublic: false });
    expect(hidden.body.data.reviewStatus).toBe("APPROVED");
    expect(hidden.body.data.isPublic).toBe(false);

    const shown = await saveProfile(token, { isPublic: true });
    expect(shown.body.data.reviewStatus).toBe("APPROVED");
    expect(shown.body.data.isPublic).toBe(true);
    expect(await isPublicAlumni(alumniId)).toBe(true);
  });

  it("publishes a profile without program and lets the alumni fill it later", async () => {
    const { alumniId, token } = await createWorkflowAlumni();

    const saved = await saveProfile(token, {
      fullName: "No Program Alumni",
      nim: `WF-PROG-${workflowSequence}`,
      angkatan: 32,
      photo: `https://example.com/program-${workflowSequence}.jpg`,
    });

    expect(saved.status).toBe(200);
    expect(saved.body.data.profileCompleted).toBe(false);

    // Approval is never blocked by completeness (Pak Dhimas' requirement).
    const approved = await approveProfile(alumniId);
    expect(approved.status).toBe(200);
    expect(approved.body.data.reviewStatus).toBe("APPROVED");
    expect(approved.body.data.isPublic).toBe(true);
    expect(await isPublicAlumni(alumniId)).toBe(true);
    expect(
      (await request(app).get(`/api/public/alumni/${alumniId}`)).status,
    ).toBe(200);

    // Program can still be claimed later: the informational flag flips to
    // complete, and the content edit re-queues the profile for review.
    const filled = await saveProfile(token, {
      program: "Mechanical Engineering",
    });
    expect(filled.status).toBe(200);
    expect(filled.body.data.profileCompleted).toBe(true);
    expect(filled.body.data.reviewStatus).toBe("PENDING");
    expect(filled.body.data.isPublic).toBe(false);
  });

  it("rejects the renamed graduationYear payload instead of dropping it silently", async () => {
    const { token } = await createWorkflowAlumni();

    const response = await saveProfile(token, {
      fullName: "Legacy Payload Alumni",
      graduationYear: 2013,
    });

    expect(response.status).toBe(400);
    expect(response.body.message).toMatch(/angkatan/i);

    const stored = await readProfile(token);
    expect(stored.body.data.angkatan).toBeFalsy();
  });

  it("keeps an approved profile public while profileCompleted is recomputed", async () => {
    const { alumniId, token } = await createWorkflowAlumni();

    await completeProfile(token);
    const approved = await approveProfile(alumniId);
    expect(approved.status).toBe(200);
    expect(approved.body.data.profileCompleted).toBe(true);
    expect(approved.body.data.reviewStatus).toBe("APPROVED");
    expect(approved.body.data.isPublic).toBe(true);
    expect(
      (await request(app).get(`/api/public/alumni/${alumniId}`)).status,
    ).toBe(200);

    // Corrupt the stored document behind the API: the flag is stale but the
    // field is gone. Publication follows `reviewStatus` + `isPublic`, never
    // the completeness flag, so the profile stays visible.
    await getAlumniCollection().updateOne(
      { _id: new ObjectId(alumniId) },
      { $set: { program: "" } },
    );
    const corrupted = await getAlumniCollection().findOne({
      _id: new ObjectId(alumniId),
    });
    expect(corrupted?.profileCompleted).toBe(true);
    expect(corrupted?.reviewStatus).toBe("APPROVED");
    expect(
      (await request(app).get(`/api/public/alumni/${alumniId}`)).status,
    ).toBe(200);
    expect(await isPublicAlumni(alumniId)).toBe(true);

    // The next write recomputes the informational flag from the fields.
    const saved = await saveProfile(token, {
      bio: "Still missing a program.",
    });
    expect(saved.status).toBe(200);
    expect(saved.body.data.profileCompleted).toBe(false);
  });
});

// ============================================================
// Rejection reason: admin must explain, alumni must see it
// ============================================================

describe("alumni rejection reason", () => {
  function reviewWithoutReason(id: string, payload: Record<string, unknown>) {
    return request(app)
      .patch(`/api/alumni/${id}/review`)
      .set("Cookie", `rams_access_token=${adminToken}`)
      .send(payload);
  }

  it("refuses a rejection without a reason", async () => {
    const { alumniId: id, token } = await createWorkflowAlumni();
    await completeProfile(token);

    const response = await reviewWithoutReason(id, { action: "REJECT" });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toMatch(/reason is required/i);

    const stored = await getAlumniCollection().findOne({
      _id: new ObjectId(id),
    });
    expect(stored?.reviewStatus).toBe("PENDING");
    expect(stored?.isPublic).toBe(false);
    expect(stored?.reviewNote ?? null).toBeNull();
  });

  it("refuses a rejection with a whitespace-only reason", async () => {
    const { alumniId: id, token } = await createWorkflowAlumni();
    await completeProfile(token);

    const response = await reviewWithoutReason(id, {
      action: "REJECT",
      reason: "   \n\t  ",
    });

    expect(response.status).toBe(400);
    expect(response.body.message).toMatch(/reason is required/i);

    const stored = await getAlumniCollection().findOne({
      _id: new ObjectId(id),
    });
    expect(stored?.reviewStatus).toBe("PENDING");
    expect(stored?.reviewNote ?? null).toBeNull();
  });

  it("stores a trimmed rejection reason together with the rejection", async () => {
    const { alumniId: id, token } = await createWorkflowAlumni();
    await completeProfile(token);

    const response = await rejectProfile(
      id,
      "  Data pekerjaan belum lengkap. Mohon lengkapi nama perusahaan.  ",
    );

    expect(response.status).toBe(200);
    expect(response.body.data.reviewStatus).toBe("REJECTED");
    expect(response.body.data.reviewNote).toBe(
      "Data pekerjaan belum lengkap. Mohon lengkapi nama perusahaan.",
    );
    expect(response.body.data.isPublic).toBe(false);
    expect(typeof response.body.data.profileCompleted).toBe("boolean");

    const stored = await getAlumniCollection().findOne({
      _id: new ObjectId(id),
    });
    expect(stored?.reviewNote).toBe(
      "Data pekerjaan belum lengkap. Mohon lengkapi nama perusahaan.",
    );
  });

  it("lets the alumni read the rejection reason on their own profile", async () => {
    const { alumniId: id, token } = await createWorkflowAlumni();
    await completeProfile(token);
    await rejectProfile(id, "Company name and position are missing.");

    const mine = await readProfile(token);

    expect(mine.status).toBe(200);
    expect(mine.body.data.reviewStatus).toBe("REJECTED");
    expect(mine.body.data.reviewNote).toBe(
      "Company name and position are missing.",
    );
  });

  it("ignores a reviewNote the alumni tries to write through a profile update", async () => {
    const { alumniId: id, token } = await createWorkflowAlumni();
    await completeProfile(token);
    await rejectProfile(id, "Original reviewer reason.");

    const tampered = await saveProfile(token, { reviewNote: "tampered" });

    expect(tampered.status).toBe(200);
    expect(tampered.body.data.reviewStatus).toBe("REJECTED");
    expect(tampered.body.data.reviewNote).toBe("Original reviewer reason.");
  });

  it("clears the active rejection when the alumni resubmits the profile", async () => {
    const { alumniId: id, token } = await createWorkflowAlumni();
    await completeProfile(token);
    await rejectProfile(id, "Please add your career history.");

    const fixed = await saveProfile(token, {
      bio: "Career history added after rejection.",
    });

    expect(fixed.status).toBe(200);
    expect(fixed.body.data.reviewStatus).toBe("PENDING");
    expect(fixed.body.data.isPublic).toBe(false);
    expect(fixed.body.data.reviewNote ?? null).toBeNull();

    const stored = await getAlumniCollection().findOne({
      _id: new ObjectId(id),
    });
    expect(stored?.reviewStatus).toBe("PENDING");
    expect(stored?.reviewNote ?? null).toBeNull();

    // The rejection no longer counts as active once the profile is queued.
    const reapproved = await approveProfile(id);
    expect(reapproved.status).toBe(200);
    expect(reapproved.body.data.reviewStatus).toBe("APPROVED");
    expect(reapproved.body.data.isPublic).toBe(true);
    expect(reapproved.body.data.reviewNote ?? null).toBeNull();
  });

  it("keeps the rejection reason until the profile is resubmitted", async () => {
    const { alumniId: id, token } = await createWorkflowAlumni();
    await completeProfile(token);
    await rejectProfile(id, "Still under review.");

    const reopened = await readProfile(token);

    expect(reopened.body.data.reviewStatus).toBe("REJECTED");
    expect(reopened.body.data.reviewNote).toBe("Still under review.");
  });

  it("does not expose the review note on public endpoints", async () => {
    const { alumniId: id, token } = await createWorkflowAlumni();
    await completeProfile(token);
    await rejectProfile(id, "Internal reviewer note that must stay private.");

    // Legacy-style record: the note is still on a profile that is publicly
    // visible. The public serializer is an allow-list, so nothing else may
    // leak through it.
    await getAlumniCollection().updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          reviewStatus: "APPROVED",
          isPublic: true,
          profileCompleted: true,
          reviewNote: "Internal reviewer note that must stay private.",
        },
      },
    );

    const detail = await request(app).get(`/api/public/alumni/${id}`);
    expect(detail.status).toBe(200);
    expect(JSON.stringify(detail.body)).not.toContain("reviewNote");
    expect(JSON.stringify(detail.body)).not.toContain("Internal reviewer note");

    const list = await request(app).get("/api/public/alumni");
    expect(JSON.stringify(list.body)).not.toContain("reviewNote");
    expect(JSON.stringify(list.body)).not.toContain("Internal reviewer note");
  });
});
