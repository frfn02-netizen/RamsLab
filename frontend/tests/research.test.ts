import { describe, expect, it, vi } from "vitest";
import { createResearchArea, getPublicResearch } from "@/lib/api/modules";

describe("research API client", () => {
  it("uses the public research endpoint and preserves bilingual data", async () => {
    const data = [
      {
        _id: "internal",
        code: "RISK",
        slug: "risk",
        title: { en: "Risk", id: "Risiko" },
        description: { en: "English", id: "Indonesia" },
        methods: { en: ["a", "b", "c"], id: ["satu", "dua", "tiga"] },
        applications: { en: "TEST", id: "UJI" },
        order: 1,
        published: true,
      },
    ];
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ success: true, data }), { status: 200 }),
      );
    vi.stubGlobal("fetch", fetchMock);
    await expect(getPublicResearch()).resolves.toEqual(data);
    expect(fetchMock.mock.calls[0][0]).toContain("/public/research");
  });

  it("sends bilingual admin payloads to the protected endpoint", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ success: true, data: { _id: "1" } }), {
          status: 201,
        }),
      );
    vi.stubGlobal("fetch", fetchMock);
    await createResearchArea({
      code: "RISK",
      slug: "risk",
      title: { en: "Risk", id: "Risiko" },
      description: { en: "English", id: "Indonesia" },
      methods: { en: ["a", "b", "c"], id: ["satu", "dua", "tiga"] },
      applications: { en: "TEST", id: "UJI" },
      order: 1,
      published: true,
    });
    expect(fetchMock.mock.calls[0][0]).toContain("/admin/research");
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).methods.en).toHaveLength(
      3,
    );
  });
});
