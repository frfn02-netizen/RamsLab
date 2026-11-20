import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ResetPasswordPanel from "@/components/dashboard/reset-password-panel";

const { resetUserPassword, success, notifyError } = vi.hoisted(() => ({
  resetUserPassword: vi.fn(),
  success: vi.fn(),
  notifyError: vi.fn(),
}));

vi.mock("@/lib/api/modules", () => ({ resetUserPassword }));
vi.mock("@/components/providers/auth-providers", () => ({
  useAuth: () => ({
    user: { id: "admin-1", role: "ADMIN", isActive: true },
  }),
}));
vi.mock("@/components/providers/toast-providers", () => ({
  useToast: () => ({ success, error: notifyError }),
}));

beforeEach(() => {
  resetUserPassword.mockReset();
  resetUserPassword
    .mockResolvedValueOnce({ temporaryPassword: "TempPass123!" })
    .mockResolvedValueOnce({ temporaryPassword: "TempPass456!" });
  success.mockReset();
  notifyError.mockReset();
});

describe("admin reset password panel", () => {
  it("hides, shows, clears, and regenerates a one-time temporary password", async () => {
    render(
      <ResetPasswordPanel
        userId="target-1"
        email="target@test.local"
        name="Target User"
        targetRole="DOSEN"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Reset password" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm reset" }));

    await waitFor(() =>
      expect(screen.getByText("TempPass123!")).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByRole("button", { name: "Hide password" }));
    expect(screen.queryByText("TempPass123!")).not.toBeInTheDocument();
    expect(screen.getByText("••••••••")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Show password" }));
    expect(screen.getByText("TempPass123!")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Clear password" }));
    expect(screen.queryByText("TempPass123!")).not.toBeInTheDocument();
    expect(
      screen.getByText("Temporary password cleared"),
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "Generate another password" }),
    );
    await waitFor(() =>
      expect(screen.getByText("TempPass456!")).toBeInTheDocument(),
    );
  });

  it("does not render a reset control for an admin target", () => {
    render(
      <ResetPasswordPanel
        userId="admin-2"
        email="admin2@test.local"
        name="Another Admin"
        targetRole="ADMIN"
      />,
    );

    expect(
      screen.queryByRole("button", { name: "Reset password" }),
    ).not.toBeInTheDocument();
  });
});
