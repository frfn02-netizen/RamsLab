import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import AddInternalAccount from "@/components/dashboard/add-internal-account";

const { createInternalAccount, notifyError } = vi.hoisted(() => ({
  createInternalAccount: vi.fn(),
  notifyError: vi.fn(),
}));

vi.mock("@/lib/api/modules", () => ({ createInternalAccount }));
vi.mock("@/components/providers/toast-providers", () => ({
  useToast: () => ({ success: vi.fn(), error: notifyError }),
}));

beforeEach(() => {
  createInternalAccount.mockReset();
  notifyError.mockReset();
});

describe("add internal account", () => {
  it("creates a standalone account and shows the one-time password", async () => {
    createInternalAccount.mockResolvedValue({
      id: "user-1",
      displayName: "Lab Staff",
      email: "lab@test.local",
      role: "ADMIN",
      isActive: true,
      mustChangePassword: true,
      temporaryPassword: "OneTimePass123!",
    });

    render(<AddInternalAccount />);

    fireEvent.click(
      screen.getByRole("button", { name: "Add internal account" }),
    );
    fireEvent.change(screen.getByLabelText("Full name"), {
      target: { value: "Lab Staff" },
    });
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "lab@test.local" },
    });
    fireEvent.change(screen.getByLabelText("Role"), {
      target: { value: "ADMIN" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));

    await waitFor(() =>
      expect(
        screen.getByText("Internal account created"),
      ).toBeInTheDocument(),
    );
    expect(createInternalAccount).toHaveBeenCalledWith({
      fullName: "Lab Staff",
      email: "lab@test.local",
      role: "ADMIN",
    });
    expect(screen.getByText("OneTimePass123!")).toBeInTheDocument();
    expect(
      screen.getByText(/No onboarding email is sent\./),
    ).toBeInTheDocument();
    expect(notifyError).not.toHaveBeenCalled();
  });

  it("reports API errors without closing the form", async () => {
    createInternalAccount.mockRejectedValue({
      response: { data: { message: "Email is already registered" } },
    });

    render(<AddInternalAccount />);
    fireEvent.click(
      screen.getByRole("button", { name: "Add internal account" }),
    );
    fireEvent.change(screen.getByLabelText("Full name"), {
      target: { value: "Duplicate" },
    });
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "lab@test.local" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));

    await waitFor(() => expect(notifyError).toHaveBeenCalled());
    expect(
      screen.getByRole("button", { name: "Create account" }),
    ).toBeInTheDocument();
  });
});
