import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import app from "../src/app.js";
import { connectDatabase } from "../src/config/database.js";
import { createResearchAreaIndexes } from "../src/modules/research/research.index.js";
import { getResearchAreasCollection } from "../src/modules/research/research.repository.js";
import {
  ensureTestUsers,
  signTestToken,
  TEST_ADMIN_USER_ID,
  TEST_DOSEN_USER_ID,
} from "./auth-fixture.js";

const TEST_CODE = "VITEST_RESEARCH";
const TEST_SLUG = "vitest-research-area";
const methods = {
  en: ["Method one", "Method two", "Method three"],
  id: ["Metode satu", "Metode dua", "Metode tiga"],
} as const;
const input = {
  code: TEST_CODE,
  slug: TEST_SLUG,
  title: { en: "Vitest research area", id: "Bidang riset Vitest" },
  description: {
    en: "A research area for API tests.",
    id: "Bidang riset untuk pengujian API.",
  },
  methods,
  applications: { en: "TESTING", id: "PENGUJIAN" },
  order: 99,
  published: true,
};

let adminToken: string;
let dosenToken: string;
let areaId: string;

beforeAll(async () => {
  await connectDatabase();
  await ensureTestUsers();
  await createResearchAreaIndexes();
  await getResearchAreasCollection().deleteMany({
    $or: [
      { code: TEST_CODE },
      { slug: TEST_SLUG },
      { code: "VITEST_RESEARCH_HIDDEN" },
    ],
  });
  adminToken = signTestToken(TEST_ADMIN_USER_ID, "ADMIN");
  dosenToken = signTestToken(TEST_DOSEN_USER_ID, "DOSEN");
});

afterAll(async () => {
  await getResearchAreasCollection().deleteMany({
    $or: [
      { code: TEST_CODE },
      { slug: TEST_SLUG },
      { code: "VITEST_RESEARCH_HIDDEN" },
    ],
  });
});

function auth(token: string) {
  return { Cookie: `rams_access_token=${token}` };
}

describe("Research Areas API", () => {
  it("rejects non-admin mutations", async () => {
    const response = await request(app)
      .post("/api/admin/research")
      .set(auth(dosenToken))
      .send(input);
    expect(response.status).toBe(403);
  });

  it("creates and gets a research area", async () => {
    const created = await request(app)
      .post("/api/admin/research")
      .set(auth(adminToken))
      .send(input);
    expect(created.status).toBe(201);
    expect(created.body.data.code).toBe(TEST_CODE);
    expect(created.body.data.updatedBy).toBe(TEST_ADMIN_USER_ID);
    areaId = created.body.data._id;

    const list = await request(app)
      .get("/api/admin/research")
      .set(auth(adminToken));
    expect(list.status).toBe(200);
    expect(
      list.body.data.some((area: { _id: string }) => area._id === areaId),
    ).toBe(true);

    const fetched = await request(app)
      .get(`/api/admin/research/${areaId}`)
      .set(auth(adminToken));
    expect(fetched.status).toBe(200);
    expect(fetched.body.data.methods.en).toHaveLength(3);
  });

  it("rejects duplicate code and duplicate slug", async () => {
    const duplicateCode = await request(app)
      .post("/api/admin/research")
      .set(auth(adminToken))
      .send({ ...input, slug: "another-vitest-research-area" });
    expect(duplicateCode.status).toBe(409);
    const duplicateSlug = await request(app)
      .post("/api/admin/research")
      .set(auth(adminToken))
      .send({ ...input, code: "VITEST_RESEARCH_OTHER" });
    expect(duplicateSlug.status).toBe(409);
  });

  it("rejects invalid bilingual data and updates a record", async () => {
    const invalid = await request(app)
      .post("/api/admin/research")
      .set(auth(adminToken))
      .send({
        ...input,
        code: "INVALID",
        slug: "invalid",
        methods: { ...methods, en: ["only one"] },
      });
    expect(invalid.status).toBe(400);
    const updated = await request(app)
      .patch(`/api/admin/research/${areaId}`)
      .set(auth(adminToken))
      .send({
        published: false,
        order: 2,
        title: input.title,
        description: input.description,
        methods: input.methods,
        applications: input.applications,
      });
    expect(updated.status).toBe(200);
    expect(updated.body.data.published).toBe(false);
    expect(updated.body.data.order).toBe(2);
    expect(updated.body.data.updatedBy).toBe(TEST_ADMIN_USER_ID);
  });

  it("returns only published areas ordered by order", async () => {
    await request(app)
      .post("/api/admin/research")
      .set(auth(adminToken))
      .send({
        ...input,
        code: "VITEST_RESEARCH_HIDDEN",
        slug: "vitest-research-hidden",
        order: 1,
        published: false,
      });
    await request(app)
      .patch(`/api/admin/research/${areaId}`)
      .set(auth(adminToken))
      .send({ published: true, order: 2 });
    const response = await request(app).get("/api/public/research");
    expect(response.status).toBe(200);
    const codes = response.body.data.map((area: { code: string }) => area.code);
    expect(codes).toContain(TEST_CODE);
    expect(codes).not.toContain("VITEST_RESEARCH_HIDDEN");
    const orders = response.body.data.map(
      (area: { order: number }) => area.order,
    );
    expect(orders).toEqual([...orders].sort((a, b) => a - b));
    const area = response.body.data.find(
      (item: { code: string }) => item.code === TEST_CODE,
    );
    expect(area._id).toBeUndefined();
  });

  it("deletes a research area", async () => {
    const response = await request(app)
      .delete(`/api/admin/research/${areaId}`)
      .set(auth(adminToken));
    expect(response.status).toBe(200);
    const missing = await request(app)
      .get(`/api/admin/research/${areaId}`)
      .set(auth(adminToken));
    expect(missing.status).toBe(404);
  });
});
