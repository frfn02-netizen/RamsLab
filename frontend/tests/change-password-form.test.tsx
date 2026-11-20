import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ChangePasswordPage from "@/app/change-password/page";

const { changePassword, refresh, notifyError } = vi.hoisted(() => ({
  changePassword: vi.fn(),
  refresh: vi.fn(),
  notifyError: vi.fn(),
}));

vi.mock("@/lib/api/auth", () => ({ changePassword }));
vi.mock("@/components/providers/auth-providers", () => ({
  useAuth: () => ({
    user: {
      id: "user-1",
      role: "DOSEN",
      isActive: true,
      mustChangePassword: true,
    },
    refresh,
  }),
}));
vi.mock("@/components/providers/toast-providers", () => ({
  useToast: () => ({ success: vi.fn(), error: notifyError }),
}));

beforeEach(() => {
  changePassword.mockReset();
  changePassword.mockResolvedValue({ reauthenticate: false });
  refresh.mockReset();
  notifyError.mockReset();
});

function fillPasswords(
  currentPassword: string,
  newPassword: string,
  confirmPassword: string,
) {
  fireEvent.change(screen.getByLabelText("Current password"), {
    target: { value: currentPassword },
  });
  fireEvent.change(screen.getByLabelText("New password"), {
    target: { value: newPassword },
  });
  fireEvent.change(screen.getByLabelText("Confirm new password"), {
    target: { value: confirmPassword },
  });
}

describe("change password form", () => {
  it("rejects a mismatched confirmation without calling the API", () => {
    render(<ChangePasswordPage />);
    fillPasswords("OldPass123!", "NewPass123!", "Different123!");

    fireEvent.click(screen.getByRole("button", { name: "Change password" }));

    expect(changePassword).not.toHaveBeenCalled();
    expect(
      screen.getByText("New password and confirmation do not match."),
    ).toBeInTheDocument();
  });

  it("rejects a new password identical to the current password", () => {
    render(<ChangePasswordPage />);
    fillPasswords("SamePass123!", "SamePass123!", "SamePass123!");

    fireEvent.click(screen.getByRole("button", { name: "Change password" }));

    expect(changePassword).not.toHaveBeenCalled();
    expect(
      screen.getByText(
        "New password must be different from the current password.",
      ),
    ).toBeInTheDocument();
  });
});
