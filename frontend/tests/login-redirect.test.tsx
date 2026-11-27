import { render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AuthUser } from "@/types/auth";

const { replace, search, auth } = vi.hoisted(() => ({
  replace: vi.fn(),
  search: { value: "" },
  auth: {
    status: "authenticated" as "authenticated" | "unauthenticated",
    user: null as AuthUser | null,
    login: vi.fn(),
  },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  useSearchParams: () => new URLSearchParams(search.value),
}));

vi.mock("next/link", () => ({
  default: ({ children, ...props }: React.ComponentProps<"a">) => (
    <a {...props}>{children}</a>
  ),
}));

vi.mock("@/components/providers/auth-providers", () => ({
  useAuth: () => auth,
}));

vi.mock("@/components/providers/toast-providers", () => ({
  useToast: () => ({ error: vi.fn() }),
}));

import LoginPage from "@/app/(internal)/(auth)/login/page";

function account(role: AuthUser["role"]): AuthUser {
  return {
    id: `${role.toLowerCase()}-1`,
    email: `${role.toLowerCase()}@example.com`,
    role,
    isActive: true,
    permissions: [],
    mustChangePassword: false,
  };
}

beforeEach(() => {
  replace.mockClear();
  search.value = "";
  auth.status = "authenticated";
  auth.user = null;
});

describe("already-authenticated login redirect", () => {
  it("preserves a safe internal callbackUrl", async () => {
    auth.user = account("ADMIN");
    search.value = "callbackUrl=%2Fmeetings%2Fcalendar";

    render(<LoginPage />);

    await waitFor(() =>
      expect(replace).toHaveBeenCalledWith("/meetings/calendar"),
    );
  });

  it("preserves a safe internal next parameter", async () => {
    auth.user = account("ADMIN");
    search.value = "next=%2Fmeetings%2Fmine";

    render(<LoginPage />);

    await waitFor(() =>
      expect(replace).toHaveBeenCalledWith("/meetings/mine"),
    );
  });

  it("rejects external redirect targets and falls back by role", async () => {
    auth.user = account("ADMIN");
    search.value = "callbackUrl=%2F%2Fevil.test%2Fmeetings";

    render(<LoginPage />);

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/dashboard"));
  });

  it("falls back to the role default when the callback is unauthorized", async () => {
    auth.user = account("DOSEN");
    search.value = "callbackUrl=%2Fdashboard";

    render(<LoginPage />);

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/meetings"));
  });
});
