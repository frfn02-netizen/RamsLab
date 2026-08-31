import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AuthProvider, useAuth } from "@/components/providers/auth-providers";

const { getCurrentUser, login, logout } = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
}));
vi.mock("@/lib/api/auth", () => ({ getCurrentUser, login, logout }));

function Probe() {
  const auth = useAuth();
  return (
    <div>
      <output>{auth.status}</output>
      <output>{auth.user?.role ?? "none"}</output>
      <button
        onClick={() =>
          void auth.login({ email: "admin@example.test", password: "password" })
        }
      >
        login
      </button>
      <button onClick={() => void auth.logout()}>logout</button>
    </div>
  );
}

describe("AuthProvider", () => {
  it("restores a session once and clears it on logout", async () => {
    getCurrentUser.mockResolvedValue({
      id: "admin-1",
      email: "admin@example.test",
      role: "ADMIN",
      isActive: true,
    });
    logout.mockResolvedValue(undefined);
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    await waitFor(() =>
      expect(screen.getByText("authenticated")).toBeInTheDocument(),
    );
    expect(getCurrentUser).toHaveBeenCalledOnce();
    expect(screen.getByText("ADMIN")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "logout" }));
    await waitFor(() =>
      expect(screen.getByText("unauthenticated")).toBeInTheDocument(),
    );
  });
});
