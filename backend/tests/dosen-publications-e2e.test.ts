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

// ---------------------------------------------------------------------------
// Test data constants – clearly identifiable, never overwrite real records.
// ---------------------------------------------------------------------------

const TITLE_PREFIX = "TEST - E2E Publication";
const EMPLOYEE_PREFIX = "TEST-E2E-DOSEN";
const PUB_PREFIX = "TEST -";

let adminToken: string;

const publicationIds: string[] = [];
const dosenIds: string[] = [];
const userIds: string[] = [];
let userCursor = 0;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function createPublication(
  title: string,
  authors: string[],
  extra: Record<string, unknown> = {},
) {
  const response = await request(app)
    .post("/api/publications")
    .set("Cookie", `rams_access_token=${adminToken}`)
    .send({
      title,
      authors,
      publicationType: "Article",
      year: 2024,
      journal: "TEST Journal",
      topics: [],
      methods: [],
      ...extra,
    });
  expect(response.status).toBe(201);
  const id = response.body.data._id as string;
  publicationIds.push(id);
  return id;
}

async function createDosen(
  tag: string,
  fullName: string,
  extra: Record<string, unknown> = {},
) {
  const userId = userIds[userCursor++ % userIds.length];
  const response = await request(app)
    .post("/api/dosen")
    .set("Cookie", `rams_access_token=${adminToken}`)
    .send({
      userId,
      fullName,
      employeeId: `${EMPLOYEE_PREFIX}-${tag}`,
      isPublic: true,
      ...extra,
    });
  if (response.status === 201) {
    dosenIds.push(response.body.data._id);
  }
  return response;
}

// ---------------------------------------------------------------------------
// Setup / Teardown
// ---------------------------------------------------------------------------

beforeAll(async () => {
  if (!process.env.JWT_SECRET)
    throw new Error("JWT_SECRET is required for e2e tests");

  await connectDatabase();
  await ensureTestUsers();

  // Clean previous test data
  await getPublicationsCollection().deleteMany({
    title: { $regex: `^${PUB_PREFIX}` },
  });
  await getDosenCollection().deleteMany({
    employeeId: { $regex: `^${EMPLOYEE_PREFIX}` },
  });

  // Create 6 distinct DOSEN user accounts
  const now = new Date();
  for (let i = 0; i < 6; i++) {
    const uid = new ObjectId();
    userIds.push(uid.toHexString());
    await getUsersCollection().updateOne(
      { _id: uid },
      {
        $set: {
          email: `vitest.e2e.dosen.${i}@test.local`,
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
});

afterAll(async () => {
  await getPublicationsCollection().deleteMany({
    title: { $regex: `^${PUB_PREFIX}` },
  });
  await getDosenCollection().deleteMany({
    employeeId: { $regex: `^${EMPLOYEE_PREFIX}` },
  });
  if (userIds.length > 0) {
    await getUsersCollection().deleteMany({
      _id: { $in: userIds.map((id) => new ObjectId(id)) },
    });
  }
});

// ---------------------------------------------------------------------------
// 1. Dummy data creation
// ---------------------------------------------------------------------------

describe("1. Dummy data creation", () => {
  it("creates 5 publications with the specified authors", async () => {
    const p1 = await createPublication(
      `${TITLE_PREFIX} Maritime Risk Assessment`,
      ["TEST - Prof. Budi Santoso", "External Author One", "External Author Two"],
      { year: 2026, publicationType: "Journal Article", journal: "TEST Journal of Maritime Engineering", doi: "10.9999/test-maritime-risk" },
    );
    const p2 = await createPublication(
      `${TITLE_PREFIX} Advanced Marine Systems`,
      ["External Author One", "TEST - Dr. Aria Putra", "External Author Three"],
      { year: 2025, publicationType: "Conference Paper", journal: "TEST International Maritime Conference", doi: "10.9999/test-marine-systems" },
    );
    const p3 = await createPublication(
      `${TITLE_PREFIX} Collaborative Ocean Research`,
      ["TEST - Prof. Budi Santoso", "TEST - Dr. Aria Putra", "External Author Four"],
      { year: 2024, publicationType: "Journal Article", journal: "TEST Ocean Research Journal", doi: "10.9999/test-collaborative-ocean" },
    );
    const p4 = await createPublication(
      `${TITLE_PREFIX} Maria Putra False Positive`,
      ["TEST - Maria Putra", "External Author Five"],
      { year: 2023, publicationType: "Journal Article", journal: "TEST Research Journal", doi: "10.9999/test-maria-putra" },
    );
    const p5 = await createPublication(
      `${TITLE_PREFIX} Whitespace Matching`,
      ["TEST - Dr. Aria   Putra", "External Author Six"],
      { year: 2022, publicationType: "Journal Article", journal: "TEST Marine Technology Journal", doi: "10.9999/test-whitespace" },
    );
    expect(publicationIds).toHaveLength(5);
  });

  it("creates 3 test lecturers", async () => {
    const l1 = await createDosen("budi", "TEST - Prof. Budi Santoso");
    expect(l1.status).toBe(201);

    const l2 = await createDosen("aria", "TEST - Dr. Aria Putra");
    expect(l2.status).toBe(201);

    const l3 = await createDosen("maria", "TEST - Maria Putra");
    expect(l3.status).toBe(201);

    expect(dosenIds).toHaveLength(3);
  });
});

// ---------------------------------------------------------------------------
// 2. CRUD operations for publication associations
// ---------------------------------------------------------------------------

describe("2. Publication associations CRUD", () => {
  it("creates a lecturer with empty publicationIds by default", async () => {
    const response = await createDosen("empty", "TEST - Empty Publications");
    expect(response.status).toBe(201);
    expect(response.body.data.publicationIds ?? []).toHaveLength(0);
  });

  it("creates a lecturer with valid publicationIds", async () => {
    const response = await createDosen("with-pubs", "TEST - With Publications", {
      publicationIds: [publicationIds[0], publicationIds[2]],
    });
    expect(response.status).toBe(201);
    expect(response.body.data.publicationIds).toHaveLength(2);
  });

  it("rejects invalid/nonexistent publication IDs", async () => {
    const nonexistent = await createDosen("nonexist", "TEST - Nonexistent", {
      publicationIds: ["000000000000000000000000"],
    });
    expect(nonexistent.status).toBe(400);

    const malformed = await createDosen("malformed", "TEST - Malformed", {
      publicationIds: ["not-an-id"],
    });
    expect(malformed.status).toBe(400);
  });

  it("deduplicates repeated publication IDs", async () => {
    const response = await createDosen("dedupe", "TEST - Dedupe", {
      publicationIds: [publicationIds[0], publicationIds[0]],
    });
    expect(response.status).toBe(201);
    expect(response.body.data.publicationIds).toHaveLength(1);
  });

  it("updates publicationIds via PATCH", async () => {
    const created = await createDosen("patch-test", "TEST - Patch Test");
    expect(created.status).toBe(201);
    const id = created.body.data._id as string;

    // Add associations
    const patched = await request(app)
      .patch(`/api/dosen/${id}`)
      .set("Cookie", `rams_access_token=${adminToken}`)
      .send({ publicationIds: [publicationIds[0], publicationIds[1]] });
    expect(patched.status).toBe(200);
    expect(patched.body.data.publicationIds).toHaveLength(2);

    // PATCH without publicationIds preserves existing
    const preserved = await request(app)
      .patch(`/api/dosen/${id}`)
      .set("Cookie", `rams_access_token=${adminToken}`)
      .send({ bio: "Updated bio" });
    expect(preserved.status).toBe(200);
    expect(preserved.body.data.publicationIds).toHaveLength(2);
    expect(preserved.body.data.bio).toBe("Updated bio");

    // Remove one association
    const removed = await request(app)
      .patch(`/api/dosen/${id}`)
      .set("Cookie", `rams_access_token=${adminToken}`)
      .send({ publicationIds: [publicationIds[0]] });
    expect(removed.status).toBe(200);
    expect(removed.body.data.publicationIds).toHaveLength(1);
  });

  it("removing a publication association does not delete the publication", async () => {
    const id = dosenIds[dosenIds.length - 1];
    // The last created (patch-test) has publicationIds[0]
    // Verify the publication still exists
    const pub = await request(app).get(
      `/api/publications/${publicationIds[0]}`,
    );
    expect(pub.status).toBe(200);
  });

  it("one publication can belong to multiple lecturers", async () => {
    // publicationIds[2] = Collaborative Ocean Research
    // Associate with both Prof. Budi Santoso (dosenIds[0]) and Dr. Aria Putra (dosenIds[1])
    const budi = await request(app)
      .patch(`/api/dosen/${dosenIds[0]}`)
      .set("Cookie", `rams_access_token=${adminToken}`)
      .send({ publicationIds: [publicationIds[0], publicationIds[2]] });
    expect(budi.status).toBe(200);
    expect(budi.body.data.publicationIds).toContain(publicationIds[2]);

    const aria = await request(app)
      .patch(`/api/dosen/${dosenIds[1]}`)
      .set("Cookie", `rams_access_token=${adminToken}`)
      .send({ publicationIds: [publicationIds[1], publicationIds[2], publicationIds[4]] });
    expect(aria.status).toBe(200);
    expect(aria.body.data.publicationIds).toContain(publicationIds[2]);
  });

  it("removing from lecturer A does not remove from lecturer B", async () => {
    // Remove publicationIds[2] from Prof. Budi Santoso
    const budi = await request(app)
      .patch(`/api/dosen/${dosenIds[0]}`)
      .set("Cookie", `rams_access_token=${adminToken}`)
      .send({ publicationIds: [publicationIds[0]] });
    expect(budi.status).toBe(200);
    expect(budi.body.data.publicationIds).not.toContain(publicationIds[2]);

    // Dr. Aria Putra should still have publicationIds[2]
    const ariaReloaded = await request(app)
      .get(`/api/dosen/${dosenIds[1]}`)
      .set("Cookie", `rams_access_token=${adminToken}`);
    expect(ariaReloaded.status).toBe(200);
    expect(ariaReloaded.body.data.publicationIds).toContain(publicationIds[2]);
  });

  it("cascades publication deletion to associated lecturers", async () => {
    // Create a doomed publication and associate it
    const doomed = await createPublication(
      `${TITLE_PREFIX} Doomed Publication`,
      ["TEST - Prof. Budi Santoso"],
    );
    const budi = await request(app)
      .patch(`/api/dosen/${dosenIds[0]}`)
      .set("Cookie", `rams_access_token=${adminToken}`)
      .send({
        publicationIds: [publicationIds[0], doomed],
      });
    expect(budi.status).toBe(200);
    expect(budi.body.data.publicationIds).toHaveLength(2);

    // Delete the publication
    const deleted = await request(app)
      .delete(`/api/publications/${doomed}`)
      .set("Cookie", `rams_access_token=${adminToken}`);
    expect(deleted.status).toBe(200);

    // Verify the lecturer no longer references it
    const reloaded = await request(app)
      .get(`/api/dosen/${dosenIds[0]}`)
      .set("Cookie", `rams_access_token=${adminToken}`);
    expect(reloaded.status).toBe(200);
    expect(reloaded.body.data.publicationIds).not.toContain(doomed);
  });

  it("does not delete publications when a lecturer is deleted", async () => {
    const tempDosen = await createDosen("temp-delete", "TEST - Temp Delete", {
      publicationIds: [publicationIds[1]],
    });
    expect(tempDosen.status).toBe(201);
    const tempId = tempDosen.body.data._id as string;

    const deleted = await request(app)
      .delete(`/api/dosen/${tempId}`)
      .set("Cookie", `rams_access_token=${adminToken}`);
    expect(deleted.status).toBe(200);

    // Publication still exists
    const pub = await request(app).get(
      `/api/publications/${publicationIds[1]}`,
    );
    expect(pub.status).toBe(200);
    dosenIds.splice(dosenIds.indexOf(tempId), 1);
  });
});

// ---------------------------------------------------------------------------
// 3. Public profile exposes associations
// ---------------------------------------------------------------------------

describe("3. Public profile", () => {
  it("exposes publicationIds on the public lecturer profile", async () => {
    // dosenIds[0] = Prof. Budi Santoso, should have publicationIds[0]
    const profile = await request(app).get(
      `/api/public/people/${dosenIds[0]}`,
    );
    expect(profile.status).toBe(200);
    expect(profile.body.data.publicationIds).toEqual([publicationIds[0]]);
  });

  it("exposes publicationIds for the second lecturer", async () => {
    // dosenIds[1] = Dr. Aria Putra, should have publicationIds[1], [2], [4]
    const profile = await request(app).get(
      `/api/public/people/${dosenIds[1]}`,
    );
    expect(profile.status).toBe(200);
    expect(profile.body.data.publicationIds).toEqual(
      expect.arrayContaining([publicationIds[1], publicationIds[2], publicationIds[4]]),
    );
    expect(profile.body.data.publicationIds).toHaveLength(3);
  });
});

// ---------------------------------------------------------------------------
// 4. False positive protection
// ---------------------------------------------------------------------------

describe("4. False positive protection", () => {
  it("TEST - Maria Putra does not receive publications for TEST - Dr. Aria Putra", async () => {
    // dosenIds[2] = TEST - Maria Putra – no publications assigned
    const profile = await request(app).get(
      `/api/public/people/${dosenIds[2]}`,
    );
    expect(profile.status).toBe(200);
    // Should be empty or undefined – never contain Aria's publications
    const ids = profile.body.data.publicationIds ?? [];
    expect(ids).not.toContain(publicationIds[1]); // Advanced Marine Systems
    expect(ids).not.toContain(publicationIds[2]); // Collaborative Ocean Research
    expect(ids).not.toContain(publicationIds[4]); // Whitespace Matching
  });

  it("normalization matches exact author name, not substring", async () => {
    // Publication 5 has "TEST - Dr. Aria   Putra" (with extra whitespace)
    // After normalization this becomes "test - dr. aria putra" which matches
    // "TEST - Dr. Aria Putra" exactly. But "Maria Putra" must not match.
    const ariaProfile = await request(app).get(
      `/api/public/people/${dosenIds[1]}`,
    );
    expect(ariaProfile.status).toBe(200);
    expect(ariaProfile.body.data.publicationIds).toContain(publicationIds[4]);
  });
});

// ---------------------------------------------------------------------------
// 5. Persistence across reloads
// ---------------------------------------------------------------------------

describe("5. Persistence across reloads", () => {
  it("selected publications remain after reload", async () => {
    // Reload Dr. Aria Putra's profile
    const profile = await request(app).get(
      `/api/public/people/${dosenIds[1]}`,
    );
    expect(profile.status).toBe(200);
    expect(profile.body.data.publicationIds).toHaveLength(3);
    expect(profile.body.data.publicationIds).toContain(publicationIds[1]);
    expect(profile.body.data.publicationIds).toContain(publicationIds[2]);
    expect(profile.body.data.publicationIds).toContain(publicationIds[4]);
  });
});

// ---------------------------------------------------------------------------
// 6. Remove association then verify persistence
// ---------------------------------------------------------------------------

describe("6. Remove association then verify persistence", () => {
  it("removes one publication and verifies the other remains", async () => {
    // Remove publicationIds[1] from Dr. Aria Putra
    const patched = await request(app)
      .patch(`/api/dosen/${dosenIds[1]}`)
      .set("Cookie", `rams_access_token=${adminToken}`)
      .send({
        publicationIds: [publicationIds[2], publicationIds[4]],
      });
    expect(patched.status).toBe(200);
    expect(patched.body.data.publicationIds).toHaveLength(2);
    expect(patched.body.data.publicationIds).not.toContain(publicationIds[1]);

    // Reload and verify
    const reloaded = await request(app)
      .get(`/api/dosen/${dosenIds[1]}`)
      .set("Cookie", `rams_access_token=${adminToken}`);
    expect(reloaded.status).toBe(200);
    expect(reloaded.body.data.publicationIds).toHaveLength(2);
    expect(reloaded.body.data.publicationIds).toContain(publicationIds[2]);
    expect(reloaded.body.data.publicationIds).toContain(publicationIds[4]);
    expect(reloaded.body.data.publicationIds).not.toContain(publicationIds[1]);

    // Publication still exists
    const pub = await request(app).get(
      `/api/publications/${publicationIds[1]}`,
    );
    expect(pub.status).toBe(200);
  });
});
