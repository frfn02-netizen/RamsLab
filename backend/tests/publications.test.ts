import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import app from "../src/app.js";
import { connectDatabase } from "../src/config/database.js";
import {
  getPublicationsCollection,
  normalizePublicationTitle,
} from "../src/modules/publications/publication.repository.js";
import {
  ensureTestUsers,
  signTestToken,
  TEST_ADMIN_USER_ID,
  TEST_DOSEN_USER_ID,
} from "./auth-fixture.js";

const titlePrefix = "Vitest Publication";
let adminToken: string;
let dosenToken: string;
let publicationId: string;

const publication = {
  title: `${titlePrefix} primary record`,
  authors: ["Demo Author One", "Demo Author Two"],
  publicationType: "Article",
  year: 2026,
  journal: "Vitest Journal",
  doi: "10.5555/vitest-publication-primary",
  pdfUrl: "https://example.org/vitest-publication.pdf",
  topics: ["Hydrodynamics", "Marine Systems"],
  methods: ["CFD", "Numerical Simulation"],
};

beforeAll(async () => {
  if (!process.env.JWT_SECRET)
    throw new Error("JWT_SECRET is required for publication tests");
  await connectDatabase();
  await ensureTestUsers();
  await getPublicationsCollection().deleteMany({
    title: { $regex: `^${titlePrefix}` },
  });
  adminToken = signTestToken(TEST_ADMIN_USER_ID, "ADMIN");
  dosenToken = signTestToken(TEST_DOSEN_USER_ID, "DOSEN");
});

afterAll(async () => {
  await getPublicationsCollection().deleteMany({
    title: { $regex: `^${titlePrefix}` },
  });
});

describe("Publications API", () => {
  it("rejects unauthenticated and non-admin writes", async () => {
    expect(
      (await request(app).post("/api/publications").send(publication)).status,
    ).toBe(401);
    expect(
      (
        await request(app)
          .post("/api/publications")
          .set("Cookie", `rams_access_token=${dosenToken}`)
          .send(publication)
      ).status,
    ).toBe(403);
  });

  it("validates required fields and URLs", async () => {
    const missing = await request(app)
      .post("/api/publications")
      .set("Cookie", `rams_access_token=${adminToken}`)
      .send({});
    expect(missing.status).toBe(400);
    const invalidUrl = await request(app)
      .post("/api/publications")
      .set("Cookie", `rams_access_token=${adminToken}`)
      .send({
        ...publication,
        title: `${titlePrefix} invalid`,
        pdfUrl: "not-a-url",
      });
    expect(invalidUrl.status).toBe(400);
  });

  it("creates and publicly reads a publication", async () => {
    const created = await request(app)
      .post("/api/publications")
      .set("Cookie", `rams_access_token=${adminToken}`)
      .send(publication);
    expect(created.status).toBe(201);
    expect(created.body.data.authors).toEqual(publication.authors);
    expect(created.body.data.publicationType).toBe("Article");
    publicationId = created.body.data._id;

    const listed = await request(app).get("/api/publications");
    expect(listed.status).toBe(200);
    expect(
      listed.body.data.some(
        (item: { _id: string }) => item._id === publicationId,
      ),
    ).toBe(true);

    const found = await request(app).get(`/api/publications/${publicationId}`);
    expect(found.status).toBe(200);
    expect(found.body.data.journal).toBe(publication.journal);

    const now = new Date();
    await getPublicationsCollection().insertOne({
      title: `${titlePrefix} legacy record`,
      authors: ["Legacy Author"],
      year: 2024,
      journal: "Legacy Journal",
      doi: null,
      pdfUrl: null,
      topics: [],
      methods: [],
      normalizedTitle: `${titlePrefix} legacy record`.toLowerCase(),
      createdAt: now,
      updatedAt: now,
    } as never);
    const legacy = await request(app).get("/api/publications");
    expect(
      legacy.body.data.find((item: { title: string }) =>
        item.title.endsWith("legacy record"),
      ).publicationType,
    ).toBe("Article");
  });

  it("supports search, year, topic, method, and repeated filters", async () => {
    const response = await request(app)
      .get("/api/publications")
      .query({
        search: "hydrodynamics",
        year: 2026,
        topic: ["Hydrodynamics", "Marine Systems"],
        method: "CFD",
        sort: "oldest",
      });
    expect(response.status).toBe(200);
    expect(response.body.data).toEqual(
      expect.arrayContaining([expect.objectContaining({ _id: publicationId })]),
    );
  });

  it("paginates public publications with a true total count", async () => {
    const now = new Date();
    const pageTitlePrefix = `${titlePrefix} public page`;
    const collection = getPublicationsCollection();
    // Facets are intentionally collection-wide. Snapshot and restore every
    // existing record so this fixture can assert exact facets without
    // depending on, or destroying, unrelated publication data.
    const existingPublications = await collection.find({}).toArray();

    try {
      await collection.deleteMany({});
      await collection.insertMany(
        Array.from({ length: 105 }, (_, index) => {
          const number = String(index + 1).padStart(3, "0");
          const title = `${pageTitlePrefix} ${number}`;
          return {
            title,
            authors: ["Pagination Author"],
            publicationType: "Article",
            year: 2026,
            journal: "Pagination Journal",
            doi: null,
            pdfUrl: null,
            topics: ["Pagination Topic"],
            methods: ["Pagination Method"],
            normalizedTitle: normalizePublicationTitle(title),
            createdAt: now,
            updatedAt: now,
          };
        }) as never[],
      );

      const firstPage = await request(app)
        .get("/api/public/publications")
        .query({ search: pageTitlePrefix, page: 1, limit: 200 });
      expect(firstPage.status).toBe(200);
      expect(firstPage.body.data).toHaveLength(105);
      expect(firstPage.body.total).toBe(105);
      expect(firstPage.body.page).toBe(1);
      expect(firstPage.body.limit).toBe(200);
      expect(firstPage.body.facets).toMatchObject({
        years: [2026],
        topics: ["Pagination Topic"],
        methods: ["Pagination Method"],
      });

      const secondPage = await request(app)
        .get("/api/public/publications")
        .query({ search: pageTitlePrefix, page: 2, limit: 100 });
      expect(secondPage.status).toBe(200);
      expect(secondPage.body.data).toHaveLength(5);
      expect(secondPage.body.total).toBe(105);
      expect(secondPage.body.data[0].title).toBe(`${pageTitlePrefix} 101`);
    } finally {
      await collection.deleteMany({});
      if (existingPublications.length > 0) {
        await collection.insertMany(existingPublications);
      }
    }
  });

  it("prevents duplicate DOI and normalized title-year records", async () => {
    const duplicateDoi = await request(app)
      .post("/api/publications")
      .set("Cookie", `rams_access_token=${adminToken}`)
      .send({ ...publication, title: `${titlePrefix} duplicate DOI` });
    expect(duplicateDoi.status).toBe(409);

    const withoutDoi = await request(app)
      .post("/api/publications")
      .set("Cookie", `rams_access_token=${adminToken}`)
      .send({
        ...publication,
        title: `${titlePrefix} title only`,
        doi: null,
        pdfUrl: null,
      });
    expect(withoutDoi.status).toBe(201);
    const normalizedDuplicate = await request(app)
      .post("/api/publications")
      .set("Cookie", `rams_access_token=${adminToken}`)
      .send({
        ...publication,
        title: `${titlePrefix} title---only`,
        doi: null,
        pdfUrl: null,
      });
    expect(normalizedDuplicate.status).toBe(409);
  });

  it("updates metadata and protects update/delete", async () => {
    expect(
      (
        await request(app)
          .patch(`/api/publications/${publicationId}`)
          .send({ title: `${titlePrefix} unauthenticated update` })
      ).status,
    ).toBe(401);
    expect(
      (
        await request(app)
          .patch(`/api/publications/${publicationId}`)
          .set("Cookie", `rams_access_token=${dosenToken}`)
          .send({ title: `${titlePrefix} dosen update` })
      ).status,
    ).toBe(403);
    const updated = await request(app)
      .patch(`/api/publications/${publicationId}`)
      .set("Cookie", `rams_access_token=${adminToken}`)
      .send({
        title: `${titlePrefix} updated`,
        authors: ["Updated Author"],
        publicationType: "Conference Paper",
        doi: null,
        pdfUrl: null,
      });
    expect(updated.status).toBe(200);
    expect(updated.body.data.authors).toEqual(["Updated Author"]);
    expect(updated.body.data.publicationType).toBe("Conference Paper");
    expect(updated.body.data.doi).toBeNull();

    expect(
      (await request(app).delete(`/api/publications/${publicationId}`).send())
        .status,
    ).toBe(401);
    expect(
      (
        await request(app)
          .delete(`/api/publications/${publicationId}`)
          .set("Cookie", `rams_access_token=${dosenToken}`)
          .send()
      ).status,
    ).toBe(403);
    const deleted = await request(app)
      .delete(`/api/publications/${publicationId}`)
      .set("Cookie", `rams_access_token=${adminToken}`)
      .send();
    expect(deleted.status).toBe(200);
    expect(
      (await request(app).get(`/api/publications/${publicationId}`)).status,
    ).toBe(404);
  });
});
