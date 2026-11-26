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

const clipboardWrite = vi.fn().mockResolvedValue(undefined);

function openModal() {
  render(<AddInternalAccount />);
  fireEvent.click(screen.getByRole("button", { name: "Add internal account" }));
}

function chooseRole(option: string) {
  fireEvent.click(screen.getByRole("combobox", { name: "Role" }));
  fireEvent.click(screen.getByRole("option", { name: option }));
}

function fillRequiredFields() {
  fireEvent.change(screen.getByLabelText("Full name"), {
    target: { value: "Lab Staff" },
  });
  fireEvent.change(screen.getByLabelText("Email"), {
    target: { value: "lab@test.local" },
  });
}

beforeEach(() => {
  createInternalAccount.mockReset();
  notifyError.mockReset();
  clipboardWrite.mockClear();
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText: clipboardWrite },
    configurable: true,
  });
});

describe("add internal account", () => {
  it("creates a standalone account through the custom role dropdown", async () => {
    createInternalAccount.mockResolvedValue({
      id: "user-1",
      displayName: "Lab Staff",
      email: "lab@test.local",
      role: "ADMIN",
      isActive: true,
      mustChangePassword: true,
      temporaryPassword: "OneTimePass123!",
    });

    openModal();

    expect(screen.getByRole("combobox", { name: "Role" })).toHaveTextContent(
      "Lecturer (DOSEN)",
    );
    fillRequiredFields();
    chooseRole("Admin (ADMIN)");
    expect(screen.getByRole("combobox", { name: "Role" })).toHaveTextContent(
      "Admin (ADMIN)",
    );
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
    expect(screen.getByText(/email address/i)).toBeInTheDocument();
    expect(
      screen.getByText(/cannot be retrieved again after you close/i),
    ).toBeInTheDocument();
    expect(notifyError).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Copy password" }));
    await waitFor(() => expect(clipboardWrite).toHaveBeenCalledWith("OneTimePass123!"));
    expect(
      screen.getByRole("button", { name: "Copied" }),
    ).toBeInTheDocument();
  });

  it("reports API errors without closing the form", async () => {
    createInternalAccount.mockRejectedValue({
      response: { data: { message: "Email is already registered" } },
    });

    openModal();
    fillRequiredFields();
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));

    await waitFor(() => expect(notifyError).toHaveBeenCalled());
    expect(
      screen.getByRole("button", { name: "Create account" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("closes the role dropdown before the dialog on Escape", async () => {
    openModal();
    const role = screen.getByRole("combobox", { name: "Role" });
    fireEvent.click(role);
    expect(screen.getByRole("listbox")).toBeInTheDocument();

    fireEvent.keyDown(role, { key: "Escape" });

    await waitFor(() =>
      expect(screen.queryByRole("listbox")).not.toBeInTheDocument(),
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("closes with Escape", () => {
    openModal();
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
