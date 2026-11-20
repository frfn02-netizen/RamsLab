import { afterEach, describe, expect, it, vi } from "vitest";
import { getAlumniStats } from "@/lib/api/alumni";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("getAlumniStats", () => {
  it("derives pending from the total so status counts stay consistent", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((input: RequestInfo | URL) => {
        const url = new URL(String(input), "http://localhost");
        const reviewStatus = url.searchParams.get("reviewStatus");
        const total =
          reviewStatus === "APPROVED"
            ? 86
            : reviewStatus === "REJECTED"
              ? 12
              : 128;

        return Promise.resolve(
          new Response(JSON.stringify({ success: true, data: [], total }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }),
        );
      }),
    );

    await expect(getAlumniStats()).resolves.toEqual({
      total: 128,
      approved: 86,
      pending: 30,
      rejected: 12,
    });
  });
});
