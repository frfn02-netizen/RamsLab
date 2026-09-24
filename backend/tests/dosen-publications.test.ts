import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { ObjectId } from "mongodb";
import app from "../src/app.js";
import { connectDatabase } from "../src/config/database.js";
import { getDosenCollection } from "../src/modules/dosen/dosen.repository.js";
import { getPublicationsCollection } from "../src/modules/publications/publication.repository.js";
import { getUsersCollection } from "../src/modules/users/user.repository.js";
import {
  ensureTestUsers,
  signTestToken,
  TEST_ADMIN_USER_ID,
} from "./auth-fixture.js";

const titlePrefix = "Vitest Dosen Publication";
const employeePrefix = "VITEST-DOSEN-PUB";

let adminToken: string;
const publicationIds: string[] = [];
const dosenIds: string[] = [];
const probeUserIds: string[] = [];
let probeUserCursor = 0;

async function createPublication(title: string, authors: string[]) {
  const response = await request(app)
    .post("/api/publications")
    .set("Cookie", `rams_access_token=${adminToken}`)
    .send({
      title,
      authors,
      publicationType: "Article",
      year: 2024,
      journal: "Vitest Journal",
      topics: [],
      methods: [],
    });
  expect(response.status).toBe(201);
  publicationIds.push(response.body.data._id);
  return response.body.data._id as string;
}

async function createDosen(
  tag: string,
  fullName: string,
  extra: Record<string, unknown> = {},
) {
  const response = await request(app)
    .post("/api/dosen")
    .set("Cookie", `rams_access_token=${adminToken}`)
    .send({
      userId: probeUserIds[probeUserCursor++ % probeUserIds.length],
      fullName,
      employeeId: `${employeePrefix}-${tag}`,
      isPublic: true,
      ...extra,
    });
  return response;
}

beforeAll(async () => {
  if (!process.env.JWT_SECRET)
    throw new Error("JWT_SECRET is required for dosen publication tests");
  await connectDatabase();
  await ensureTestUsers();
  await getPublicationsCollection().deleteMany({
    title: { $regex: `^${titlePrefix}` },
  });
  await getDosenCollection().deleteMany({
    employeeId: { $regex: `^${employeePrefix}` },
  });
  // Each dosen requires a distinct active DOSEN user account.
  const now = new Date();
  for (let i = 0; i < 8; i += 1) {
    const userId = new ObjectId();
    probeUserIds.push(userId.toHexString());
    await getUsersCollection().updateOne(
      { _id: userId },
      {
        $set: {
          email: `vitest.dosen.pub.${i}@test.local`,
          role: "DOSEN",
          isActive: true,
          tokenVersion: 0,
          updatedAt: now,
        },
        $setOnInsert: {
          passwordHash: "not-used-by-tests",
          lastLoginAt: null,
          createdAt: now,
        },
      },
      { upsert: true },
    );
  }
  adminToken = signTestToken(TEST_ADMIN_USER_ID, "ADMIN");

  await createPublication(`${titlePrefix} A`, [
    "Vitest Lecturer",
    "Vitest Coauthor",
    "External Researcher",
  ]);
  await createPublication(`${titlePrefix} B`, ["Other Person", "Jane Doe"]);
  await createPublication(`${titlePrefix} C`, [
    "Vitest Lecturer",
    "R. Firmansyah",
  ]);
});

afterAll(async () => {
  await getPublicationsCollection().deleteMany({
    title: { $regex: `^${titlePrefix}` },
  });
  await getDosenCollection().deleteMany({
    employeeId: { $regex: `^${employeePrefix}` },
  });
  if (probeUserIds.length > 0) {
    await getUsersCollection().deleteMany({
      _id: { $in: probeUserIds.map((id) => new ObjectId(id)) },
    });
  }
});

describe("Dosen publication associations", () => {
  it("creates a dosen with validated publication associations", async () => {
    const response = await createDosen("create", "Vitest Lecturer", {
      publicationIds: [publicationIds[0], publicationIds[2]],
    });
    expect(response.status).toBe(201);
    dosenIds.push(response.body.data._id);
    expect(response.body.data.publicationIds).toHaveLength(2);
  });

  it("rejects unknown and malformed publication IDs", async () => {
    const unknown = await createDosen("unknown", "Vitest Lecturer", {
      publicationIds: ["000000000000000000000000"],
    });
    expect(unknown.status).toBe(400);

    const malformed = await createDosen("malformed", "Vitest Lecturer", {
      publicationIds: ["not-an-id"],
    });
    expect(malformed.status).toBe(400);
  });

  it("dedupes repeated publication IDs", async () => {
    const response = await createDosen("dedupe", "Vitest Lecturer", {
      publicationIds: [publicationIds[0], publicationIds[0]],
    });
    expect(response.status).toBe(201);
    dosenIds.push(response.body.data._id);
    expect(response.body.data.publicationIds).toHaveLength(1);
  });

  it("updates associations without wiping other lecturer fields", async () => {
    const created = await createDosen("update", "Vitest Lecturer", {
      bio: "Original biography",
      education: [{ degree: "PhD", field: "Marine", institution: "ITS" }],
    });
    expect(created.status).toBe(201);
    const id = created.body.data._id as string;
    dosenIds.push(id);

    const updated = await request(app)
      .patch(`/api/dosen/${id}`)
      .set("Cookie", `rams_access_token=${adminToken}`)
      .send({ publicationIds: [publicationIds[0], publicationIds[2]] });
    expect(updated.status).toBe(200);
    expect(updated.body.data.publicationIds).toHaveLength(2);
    expect(updated.body.data.bio).toBe("Original biography");
    expect(updated.body.data.education).toHaveLength(1);

    // PATCH without publicationIds preserves existing associations.
    const renamed = await request(app)
      .patch(`/api/dosen/${id}`)
      .set("Cookie", `rams_access_token=${adminToken}`)
      .send({ title: "Prof." });
    expect(renamed.status).toBe(200);
    expect(renamed.body.data.publicationIds).toHaveLength(2);

    // Removing an association keeps the publication itself intact.
    const removed = await request(app)
      .patch(`/api/dosen/${id}`)
      .set("Cookie", `rams_access_token=${adminToken}`)
      .send({ publicationIds: [publicationIds[2]] });
    expect(removed.status).toBe(200);
    expect(removed.body.data.publicationIds).toHaveLength(1);

    const publication = await request(app).get(
      `/api/publications/${publicationIds[0]}`,
    );
    expect(publication.status).toBe(200);
  });

  it("exposes associations on the public lecturer profile", async () => {
    const created = await createDosen("public", "Vitest Lecturer", {
      publicationIds: [publicationIds[0]],
    });
    expect(created.status).toBe(201);
    const id = created.body.data._id as string;
    dosenIds.push(id);

    const profile = await request(app).get(`/api/public/people/${id}`);
    expect(profile.status).toBe(200);
    expect(profile.body.data.publicationIds).toEqual([publicationIds[0]]);
  });

  it("cleans lecturer references when a publication is deleted", async () => {
    const doomed = await createPublication(`${titlePrefix} doomed`, [
      "Vitest Lecturer",
    ]);
    const created = await createDosen("cleanup", "Vitest Lecturer", {
      publicationIds: [doomed],
    });
    expect(created.status).toBe(201);
    const id = created.body.data._id as string;
    dosenIds.push(id);

    const deleted = await request(app)
      .delete(`/api/publications/${doomed}`)
      .set("Cookie", `rams_access_token=${adminToken}`);
    expect(deleted.status).toBe(200);

    const reloaded = await request(app)
      .get(`/api/dosen/${id}`)
      .set("Cookie", `rams_access_token=${adminToken}`);
    expect(reloaded.status).toBe(200);
    expect(reloaded.body.data.publicationIds ?? []).toHaveLength(0);
    publicationIds.splice(publicationIds.indexOf(doomed), 1);
  });

  it("does not delete publications when a lecturer is deleted", async () => {
    const created = await createDosen("nodelete", "Vitest Lecturer", {
      publicationIds: [publicationIds[1]],
    });
    expect(created.status).toBe(201);
    const id = created.body.data._id as string;

    const deleted = await request(app)
      .delete(`/api/dosen/${id}`)
      .set("Cookie", `rams_access_token=${adminToken}`);
    expect(deleted.status).toBe(200);

    const publication = await request(app).get(
      `/api/publications/${publicationIds[1]}`,
    );
    expect(publication.status).toBe(200);
    dosenIds.splice(dosenIds.indexOf(id), 1);
  });
});
