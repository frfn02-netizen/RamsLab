import { describe, expect, it, vi } from "vitest";
import { login } from "@/lib/api/auth";

describe("authentication API flow", () => {
  it("logs in and restores the current user through /auth/me", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ success: true, user: { id: "user-1", email: "admin@example.test", role: "ADMIN", isActive: true }, csrfToken: "login-csrf" }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ success: true, user: { userId: "user-1", role: "ADMIN" } }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ success: true, csrfToken: "refresh-csrf" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(login({ email: "admin@example.test", password: "correct-password" })).resolves.toMatchObject({ id: "user-1", role: "ADMIN" });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[0][0]).toContain("/auth/login");
    expect(fetchMock.mock.calls[1][0]).toContain("/auth/me");
    expect(fetchMock.mock.calls[2][0]).toContain("/auth/csrf");
  });
});
