import { describe, expect, it, vi } from "vitest";
import { getPublicPartners, getPublicProjects } from "@/lib/api/modules";

describe("public API modules", () => {
  it("uses unauthenticated public project and partner endpoints", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ success: true, data: [] }), {
          status: 200,
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ success: true, data: [] }), {
          status: 200,
        }),
      );
    vi.stubGlobal("fetch", fetchMock);

    await expect(getPublicProjects()).resolves.toEqual([]);
    await expect(getPublicPartners("INDUSTRIAL")).resolves.toEqual([]);
    expect(fetchMock.mock.calls[0][0]).toContain("/public/projects");
    expect(fetchMock.mock.calls[1][0]).toContain("/public/partners/industrial");
  });
});
