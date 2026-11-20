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
  membershipRequired: null as (() => void) | null,
}));
vi.mock("@/lib/api/auth", () => ({ getCurrentUser, login, logout }));
vi.mock("@/lib/api/client", () => ({
  onUnauthorized: (handler: (() => void) | null) => {
    clientHandlers.unauthorized = handler;
    return () => {
      clientHandlers.unauthorized = null;
    };
  },
  onLabMembershipRequired: (handler: (() => void) | null) => {
    clientHandlers.membershipRequired = handler;
    return () => {
      clientHandlers.membershipRequired = null;
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
      <output>{auth.user?.labMembership?.status ?? "no-membership"}</output>
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
  clientHandlers.membershipRequired = null;
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
    expect(screen.getByText("Budi Santoso")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "logout" }));
    await waitFor(() =>
      expect(screen.getByText("unauthenticated")).toBeInTheDocument(),
    );
  });
  it("revalidates membership when a request requires lab membership", async () => {
    getCurrentUser
      .mockResolvedValueOnce({
        id: "dosen-1",
        email: "dosen@example.test",
        role: "DOSEN",
        isActive: true,
        labMembership: { labId: "rams", status: "INACTIVE" },
      })
      .mockResolvedValueOnce({
        id: "dosen-1",
        email: "dosen@example.test",
        role: "DOSEN",
        isActive: true,
        labMembership: { labId: "rams", status: "ACTIVE" },
      });

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    await screen.findByText("INACTIVE");

    await act(async () => {
      clientHandlers.membershipRequired?.();
    });

    expect(await screen.findByText("ACTIVE")).toBeInTheDocument();
    expect(getCurrentUser).toHaveBeenCalledTimes(2);
  });

  it("deduplicates concurrent membership revalidation requests", async () => {
    let resolveRefresh!: (value: unknown) => void;
    getCurrentUser
      .mockResolvedValueOnce({
        id: "dosen-1",
        email: "dosen@example.test",
        role: "DOSEN",
        isActive: true,
        labMembership: { labId: "rams", status: "INACTIVE" },
      })
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveRefresh = resolve;
          }),
      );

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    await screen.findByText("INACTIVE");

    act(() => {
      clientHandlers.membershipRequired?.();
      clientHandlers.membershipRequired?.();
    });

    expect(getCurrentUser).toHaveBeenCalledTimes(2);
    resolveRefresh({
      id: "dosen-1",
      email: "dosen@example.test",
      role: "DOSEN",
      isActive: true,
      labMembership: { labId: "rams", status: "ACTIVE" },
    });
    expect(await screen.findByText("ACTIVE")).toBeInTheDocument();
  });

  it("does not retry automatically after a failed forced revalidation", async () => {
    getCurrentUser
      .mockResolvedValueOnce({
        id: "dosen-1",
        email: "dosen@example.test",
        role: "DOSEN",
        isActive: true,
        labMembership: { labId: "rams", status: "ACTIVE" },
      })
      .mockRejectedValueOnce(new Error("network"));

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    await screen.findByText("ACTIVE");

    await act(async () => {
      clientHandlers.membershipRequired?.();
    });
    expect(screen.getByText("authenticated")).toBeInTheDocument();
    expect(getCurrentUser).toHaveBeenCalledTimes(2);

    await act(async () => {
      await Promise.resolve();
    });
    expect(getCurrentUser).toHaveBeenCalledTimes(2);
  });

  it("revalidates membership when the browser regains focus", async () => {
    getCurrentUser
      .mockResolvedValueOnce({
        id: "dosen-1",
        email: "dosen@example.test",
        role: "DOSEN",
        isActive: true,
        labMembership: { labId: "rams", status: "INACTIVE" },
      })
      .mockResolvedValueOnce({
        id: "dosen-1",
        email: "dosen@example.test",
        role: "DOSEN",
        isActive: true,
        labMembership: { labId: "rams", status: "ACTIVE" },
      });

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    await screen.findByText("INACTIVE");

    act(() => {
      window.dispatchEvent(new Event("focus"));
    });

    expect(await screen.findByText("ACTIVE")).toBeInTheDocument();
    expect(getCurrentUser).toHaveBeenCalledTimes(2);
  });

  it("discards a membership response that resolves after logout", async () => {
    let resolveRevalidation!: (value: unknown) => void;
    getCurrentUser
      .mockResolvedValueOnce({
        id: "dosen-1",
        email: "dosen@example.test",
        role: "DOSEN",
        isActive: true,
        fullName: "User One",
        labMembership: { labId: "rams", status: "INACTIVE" },
      })
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveRevalidation = resolve;
          }),
      );

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    await screen.findByText("INACTIVE");

    act(() => {
      clientHandlers.membershipRequired?.();
    });
    await waitFor(() => expect(getCurrentUser).toHaveBeenCalledTimes(2));

    fireEvent.click(screen.getByRole("button", { name: "logout" }));
    await waitFor(() =>
      expect(screen.getByText("unauthenticated")).toBeInTheDocument(),
    );

    await act(async () => {
      resolveRevalidation({
        id: "dosen-1",
        email: "dosen@example.test",
        role: "DOSEN",
        isActive: true,
        fullName: "User One",
        labMembership: { labId: "rams", status: "ACTIVE" },
      });
      await Promise.resolve();
    });

    expect(screen.getByText("unauthenticated")).toBeInTheDocument();
    expect(screen.queryByText("User One")).not.toBeInTheDocument();
  });

  it("does not let an old membership response replace a newer login", async () => {
    let resolveRevalidation!: (value: unknown) => void;
    getCurrentUser
      .mockResolvedValueOnce({
        id: "dosen-1",
        email: "dosen@example.test",
        role: "DOSEN",
        isActive: true,
        fullName: "User One",
        labMembership: { labId: "rams", status: "INACTIVE" },
      })
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveRevalidation = resolve;
          }),
      );
    login.mockResolvedValue({
      id: "dosen-2",
      email: "dosen2@example.test",
      role: "DOSEN",
      isActive: true,
      fullName: "User Two",
      labMembership: { labId: "rams", status: "ACTIVE" },
    });

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    await screen.findByText("INACTIVE");

    act(() => {
      clientHandlers.membershipRequired?.();
    });
    await waitFor(() => expect(getCurrentUser).toHaveBeenCalledTimes(2));

    fireEvent.click(screen.getByRole("button", { name: "login" }));
    expect(await screen.findByText("User Two")).toBeInTheDocument();

    await act(async () => {
      resolveRevalidation({
        id: "dosen-1",
        email: "dosen@example.test",
        role: "DOSEN",
        isActive: true,
        fullName: "User One",
        labMembership: { labId: "rams", status: "ACTIVE" },
      });
      await Promise.resolve();
    });

    expect(screen.getByText("User Two")).toBeInTheDocument();
    expect(screen.getByText("authenticated")).toBeInTheDocument();
  });

  it("lets an authorization revalidation bypass the focus throttle", async () => {
    const activeUser = {
      id: "dosen-1",
      email: "dosen@example.test",
      role: "DOSEN",
      isActive: true,
      labMembership: { labId: "rams", status: "ACTIVE" },
    };
    getCurrentUser.mockResolvedValue(activeUser);

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    await screen.findByText("ACTIVE");

    act(() => {
      window.dispatchEvent(new Event("focus"));
    });
    await waitFor(() => expect(getCurrentUser).toHaveBeenCalledTimes(2));

    act(() => {
      window.dispatchEvent(new Event("focus"));
    });
    await act(async () => {
      await Promise.resolve();
    });
    expect(getCurrentUser).toHaveBeenCalledTimes(2);

    act(() => {
      clientHandlers.membershipRequired?.();
    });
    await waitFor(() => expect(getCurrentUser).toHaveBeenCalledTimes(3));
  });

  it("forces revalidation after a failed focus refresh", async () => {
    getCurrentUser
      .mockResolvedValueOnce({
        id: "dosen-1",
        email: "dosen@example.test",
        role: "DOSEN",
        isActive: true,
        labMembership: { labId: "rams", status: "ACTIVE" },
      })
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce({
        id: "dosen-1",
        email: "dosen@example.test",
        role: "DOSEN",
        isActive: true,
        labMembership: { labId: "rams", status: "INACTIVE" },
      });

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    await screen.findByText("ACTIVE");

    await act(async () => {
      window.dispatchEvent(new Event("focus"));
    });
    await waitFor(() => expect(getCurrentUser).toHaveBeenCalledTimes(2));

    act(() => {
      clientHandlers.membershipRequired?.();
    });
    expect(await screen.findByText("INACTIVE")).toBeInTheDocument();
    expect(getCurrentUser).toHaveBeenCalledTimes(3);
  });

  it("removes the exact focus and visibility listeners on unmount", async () => {
    getCurrentUser.mockResolvedValue({
      id: "dosen-1",
      email: "dosen@example.test",
      role: "DOSEN",
      isActive: true,
      labMembership: { labId: "rams", status: "ACTIVE" },
    });
    const addWindowListener = vi.spyOn(window, "addEventListener");
    const removeWindowListener = vi.spyOn(window, "removeEventListener");
    const addDocumentListener = vi.spyOn(document, "addEventListener");
    const removeDocumentListener = vi.spyOn(document, "removeEventListener");

    const view = render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    await screen.findByText("ACTIVE");

    const focusListener = addWindowListener.mock.calls.find(
      ([event]) => event === "focus",
    )?.[1];
    const visibilityListener = addDocumentListener.mock.calls.find(
      ([event]) => event === "visibilitychange",
    )?.[1];
    expect(focusListener).toBeTypeOf("function");
    expect(visibilityListener).toBeTypeOf("function");

    view.unmount();

    expect(removeWindowListener).toHaveBeenCalledWith("focus", focusListener);
    expect(removeDocumentListener).toHaveBeenCalledWith(
      "visibilitychange",
      visibilityListener,
    );

    addWindowListener.mockRestore();
    removeWindowListener.mockRestore();
    addDocumentListener.mockRestore();
    removeDocumentListener.mockRestore();
  });
});
