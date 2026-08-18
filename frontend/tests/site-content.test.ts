import { describe, expect, it, vi } from "vitest";
import { getPublicSiteContent, updateAdminSiteContent } from "@/lib/api/modules";
import type { HomepageContent } from "@/types/site-content";

const content: HomepageContent = {
  hero: { headline: { en: "English", id: "Indonesia" }, description: { en: "Description", id: "Deskripsi" }, primaryCta: { en: "Explore", id: "Jelajahi" }, secondaryCta: { en: "About", id: "Tentang" } },
  principles: [
    { key: "R", title: { en: "Reliability", id: "Keandalan" }, description: { en: "R", id: "R" } },
    { key: "A", title: { en: "Availability", id: "Ketersediaan" }, description: { en: "A", id: "A" } },
    { key: "M", title: { en: "Management", id: "Manajemen" }, description: { en: "M", id: "M" } },
    { key: "S", title: { en: "Safety", id: "Keselamatan" }, description: { en: "S", id: "S" } },
  ],
  ecosystem: { title: { en: "Ecosystem", id: "Ekosistem" }, aisDescription: { en: "AIS", id: "AIS" } },
  research: { title: { en: "Research", id: "Riset" }, description: { en: "Description", id: "Deskripsi" }, linkLabel: { en: "Explore", id: "Jelajahi" } },
  projects: { title: { en: "Projects", id: "Proyek" } },
  cta: { title: { en: "CTA", id: "CTA" }, description: { en: "Description", id: "Deskripsi" }, buttonLabel: { en: "Contact", id: "Kontak" } },
};

describe("site content API client", () => {
  it("unwraps public content from the public endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: true, data: content }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(getPublicSiteContent("homepage")).resolves.toEqual(content);
    expect(fetchMock.mock.calls[0][0]).toContain("/public/site-content/homepage");
  });

  it("sends admin updates through the shared client", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: true, data: { key: "homepage", page: "homepage", content, createdAt: "", updatedAt: "" } }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await updateAdminSiteContent("homepage", content);
    expect(fetchMock.mock.calls[0][0]).toContain("/admin/site-content/homepage");
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).content.principles).toHaveLength(4);
  });
});
