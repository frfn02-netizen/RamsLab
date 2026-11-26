import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider, useAuth } from "@/components/providers/auth-providers";

const { getCurrentUser, login, logout } = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
}));
const clientHandlers = vi.hoisted(() => ({
  unauthorized: null as (() => void) | null,
}));
vi.mock("@/lib/api/auth", () => ({ getCurrentUser, login, logout }));
vi.mock("@/lib/api/client", () => ({
  onUnauthorized: (handler: (() => void) | null) => {
    clientHandlers.unauthorized = handler;
    return () => {
      clientHandlers.unauthorized = null;
    };
  },
}));

function Probe() {
  const auth = useAuth();
  return (
    <div>
      <output>{auth.status}</output>
      <output>{auth.user?.role ?? "none"}</output>
      <output>{auth.user?.fullName ?? "no-name"}</output>
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

beforeEach(() => {
  vi.clearAllMocks();
  clientHandlers.unauthorized = null;
  logout.mockResolvedValue(undefined);
});

describe("AuthProvider", () => {
  it("restores a session once and clears it on logout", async () => {
    getCurrentUser.mockResolvedValue({
      id: "admin-1",
      email: "admin@example.test",
      role: "ADMIN",
      isActive: true,
      fullName: "Budi Santoso",
    });

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
    expect(screen.getByText("Budi Santoso")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "logout" }));
    await waitFor(() =>
      expect(screen.getByText("unauthenticated")).toBeInTheDocument(),
    );
  });

  it("clears the session when the API reports an unauthorized response", async () => {
    getCurrentUser.mockResolvedValue({
      id: "dosen-1",
      email: "dosen@example.test",
      role: "DOSEN",
      isActive: true,
    });

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    await screen.findByText("DOSEN");

    await act(async () => {
      clientHandlers.unauthorized?.();
    });

    expect(screen.getByText("unauthenticated")).toBeInTheDocument();
  });

  it("stores an authenticated user after login", async () => {
    getCurrentUser.mockRejectedValue(new Error("unauthenticated"));
    login.mockResolvedValue({
      id: "admin-2",
      email: "admin2@example.test",
      role: "ADMIN",
      isActive: true,
      fullName: "User Two",
    });

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    await waitFor(() =>
      expect(screen.getByText("unauthenticated")).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByRole("button", { name: "login" }));
    expect(await screen.findByText("User Two")).toBeInTheDocument();
    expect(screen.getByText("authenticated")).toBeInTheDocument();
  });
});
