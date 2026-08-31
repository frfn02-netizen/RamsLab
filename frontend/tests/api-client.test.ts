import { describe, expect, it, vi } from "vitest";
import { apiRequest, onUnauthorized, setCsrfToken } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";

describe("API client", () => {
  it("includes credentials and sends CSRF only for mutations", async () => {
    document.cookie = "rams_csrf_token=test-csrf";
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ success: true, data: { ok: true } }), {
          status: 200,
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ success: true, data: { ok: true } }), {
          status: 200,
        }),
      );
    vi.stubGlobal("fetch", fetchMock);

    await apiRequest("/safe");
    await apiRequest("/write", {
      method: "PATCH",
      body: JSON.stringify({ value: 1 }),
    });

    const safeOptions = fetchMock.mock.calls[0][1] as RequestInit;
    const mutationOptions = fetchMock.mock.calls[1][1] as RequestInit;
    expect(fetchMock.mock.calls[0][0]).toContain("/safe");
    expect(safeOptions.credentials).toBe("include");
    expect((safeOptions.headers as Headers).get("Accept")).toBe(
      "application/json",
    );
    expect((safeOptions.headers as Headers).get("X-CSRF-Token")).toBeNull();
    expect(fetchMock.mock.calls[1][0]).toContain("/write");
    expect(mutationOptions.credentials).toBe("include");
    expect((mutationOptions.headers as Headers).get("X-CSRF-Token")).toBe(
      "test-csrf",
    );
    expect((mutationOptions.headers as Headers).get("Content-Type")).toBe(
      "application/json",
    );
  });

  it("uses the stored CSRF token when the API cookie belongs to another origin", async () => {
    setCsrfToken("stored-csrf");
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify({ success: true, data: { ok: true } }), {
            status: 200,
          }),
        ),
    );

    await apiRequest("/write", {
      method: "PUT",
      body: JSON.stringify({ value: 1 }),
    });

    const requestOptions = (fetch as unknown as ReturnType<typeof vi.fn>).mock
      .calls[0][1] as RequestInit;
    expect((requestOptions.headers as Headers).get("X-CSRF-Token")).toBe(
      "stored-csrf",
    );
  });

  it("refreshes the CSRF token and retries a failed mutation once", async () => {
    setCsrfToken("stale-csrf");
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ success: false, message: "CSRF validation failed" }),
          { status: 403 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ success: true, csrfToken: "fresh-csrf" }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ success: true, data: { created: true } }),
          { status: 201 },
        ),
      );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      apiRequest("/publications", {
        method: "POST",
        body: JSON.stringify({ title: "Test" }),
      }),
    ).resolves.toEqual({ created: true });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[1][0]).toContain("/auth/csrf");
    expect(
      (fetchMock.mock.calls[2][1].headers as Headers).get("X-CSRF-Token"),
    ).toBe("fresh-csrf");
  });

  it("parses safe server errors and notifies the auth layer on 401", async () => {
    const unauthorized = vi.fn();
    const removeHandler = onUnauthorized(unauthorized);
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(
            JSON.stringify({ success: false, message: "Session expired" }),
            { status: 401 },
          ),
        ),
    );

    await expect(apiRequest("/dashboard")).rejects.toMatchObject({
      status: 401,
      message: "Session expired",
    });
    expect(unauthorized).toHaveBeenCalledOnce();
    removeHandler();
  });

  it("normalizes network failures into ApiError", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    await expect(apiRequest("/public/projects")).rejects.toBeInstanceOf(
      ApiError,
    );
    await expect(apiRequest("/public/projects")).rejects.toMatchObject({
      status: 0,
    });
  });
});
