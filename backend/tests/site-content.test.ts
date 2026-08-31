import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import app from "../src/app.js";
import { connectDatabase } from "../src/config/database.js";
import { createSiteContentIndexes } from "../src/modules/site-content/site-content.index.js";
import {
  findSiteContentByKey,
  getSiteContentCollection,
  upsertSiteContent,
} from "../src/modules/site-content/site-content.repository.js";
import type { HomepageContent } from "../src/modules/site-content/site-content.types.js";
import {
  ensureTestUsers,
  signTestToken,
  TEST_ADMIN_USER_ID,
  TEST_DOSEN_USER_ID,
} from "./auth-fixture.js";

const testContent: HomepageContent = {
  hero: {
    headline: { en: "Test headline", id: "Judul uji" },
    description: { en: "Test description", id: "Deskripsi uji" },
    primaryCta: { en: "Primary", id: "Utama" },
    secondaryCta: { en: "Secondary", id: "Sekunder" },
  },
  principles: [
    {
      key: "R",
      title: { en: "Reliability", id: "Keandalan" },
      description: { en: "Test R", id: "Uji R" },
    },
    {
      key: "A",
      title: { en: "Availability", id: "Ketersediaan" },
      description: { en: "Test A", id: "Uji A" },
    },
    {
      key: "M",
      title: { en: "Management", id: "Manajemen" },
      description: { en: "Test M", id: "Uji M" },
    },
    {
      key: "S",
      title: { en: "Safety", id: "Keselamatan" },
      description: { en: "Test S", id: "Uji S" },
    },
  ],
  ecosystem: {
    title: { en: "Ecosystem", id: "Ekosistem" },
    aisDescription: { en: "AIS", id: "AIS" },
  },
  research: {
    title: { en: "Research", id: "Riset" },
    description: { en: "Research description", id: "Deskripsi riset" },
    linkLabel: { en: "Explore", id: "Jelajahi" },
  },
  projects: { title: { en: "Projects", id: "Proyek" } },
  cta: {
    title: { en: "CTA", id: "CTA" },
    description: { en: "CTA description", id: "Deskripsi CTA" },
    buttonLabel: { en: "Contact", id: "Kontak" },
  },
};

let adminToken: string;
let dosenToken: string;
let originalContent: Awaited<ReturnType<typeof findSiteContentByKey>>;

beforeAll(async () => {
  await connectDatabase();
  await ensureTestUsers();
  await createSiteContentIndexes();
  originalContent = await findSiteContentByKey("homepage");
  await upsertSiteContent("homepage", testContent);
  adminToken = signTestToken(TEST_ADMIN_USER_ID, "ADMIN");
  dosenToken = signTestToken(TEST_DOSEN_USER_ID, "DOSEN");
});

afterAll(async () => {
  if (originalContent)
    await upsertSiteContent("homepage", originalContent.content);
  else await getSiteContentCollection().deleteOne({ key: "homepage" });
});

function auth(token: string) {
  return { Cookie: `rams_access_token=${token}` };
}

describe("Site Content API", () => {
  it("allows an admin to read and update content", async () => {
    const list = await request(app)
      .get("/api/admin/site-content")
      .set(auth(adminToken));
    expect(list.status).toBe(200);
    expect(
      list.body.data.some((item: { key: string }) => item.key === "homepage"),
    ).toBe(true);

    const updated = await request(app)
      .put("/api/admin/site-content/homepage")
      .set(auth(adminToken))
      .send({ content: testContent });
    expect(updated.status).toBe(200);
    expect(updated.body.data.content.hero.headline.en).toBe("Test headline");
    expect(updated.body.data.updatedBy).toBe(TEST_ADMIN_USER_ID);
  });

  it("rejects non-admin updates and invalid keys/data", async () => {
    const forbidden = await request(app)
      .put("/api/admin/site-content/homepage")
      .set(auth(dosenToken))
      .send({ content: testContent });
    expect(forbidden.status).toBe(403);
    const invalidKey = await request(app)
      .get("/api/admin/site-content/unknown")
      .set(auth(adminToken));
    expect(invalidKey.status).toBe(400);
    const invalidData = await request(app)
      .put("/api/admin/site-content/homepage")
      .set(auth(adminToken))
      .send({ content: {} });
    expect(invalidData.status).toBe(400);
  });

  it("returns public content without admin metadata", async () => {
    const response = await request(app).get(
      "/api/public/site-content/homepage",
    );
    expect(response.status).toBe(200);
    expect(response.body.data.hero.headline.id).toBe("Judul uji");
    expect(response.body.data.createdAt).toBeUndefined();
    expect(response.body.data.updatedAt).toBeUndefined();
  });

  it("keeps a content key idempotent", async () => {
    await upsertSiteContent("homepage", testContent);
    await upsertSiteContent("homepage", testContent);
    expect(
      await getSiteContentCollection().countDocuments({ key: "homepage" }),
    ).toBe(1);
  });
});
