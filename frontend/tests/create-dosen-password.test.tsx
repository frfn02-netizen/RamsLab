import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CreateDosen from "@/components/dashboard/create-dosen";

const {
  createDosenAccount,
  createDosen,
  uploadDosenPhoto,
  resetUserPassword,
  notifyError,
} = vi.hoisted(() => ({
  createDosenAccount: vi.fn(),
  createDosen: vi.fn(),
  uploadDosenPhoto: vi.fn(),
  resetUserPassword: vi.fn(),
  notifyError: vi.fn(),
}));

vi.mock("@/lib/api/modules", () => ({
  createDosenAccount,
  createDosen,
  uploadDosenPhoto,
  resetUserPassword,
}));
vi.mock("@/components/providers/toast-providers", () => ({
  useToast: () => ({ success: vi.fn(), error: notifyError }),
}));

beforeEach(() => {
  createDosenAccount.mockReset();
  createDosen.mockReset();
  uploadDosenPhoto.mockReset();
  resetUserPassword.mockReset();
  notifyError.mockReset();

  createDosenAccount.mockResolvedValue({
    id: "user-1",
    email: "dosen@test.local",
    role: "DOSEN",
    isActive: true,
    temporaryPassword: "TempPass123!",
  });
  createDosen.mockResolvedValue({ _id: "dosen-1" });
  resetUserPassword.mockResolvedValue({ temporaryPassword: "TempPass456!" });
});

describe("create dosen temporary password", () => {
  it("shows, hides, clears, and regenerates the server-generated password", async () => {
    const { container } = render(<CreateDosen />);
    const form = container.querySelector("form");
    expect(form).not.toBeNull();
    fireEvent.submit(form!);

    await waitFor(() =>
      expect(screen.getByText("Dosen created")).toBeInTheDocument(),
    );
    expect(screen.getByText("TempPass123!")).toBeInTheDocument();

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
      screen.getByRole("button", {
        name: "Generate a new temporary password",
      }),
    );
    await waitFor(() =>
      expect(screen.getByText("TempPass456!")).toBeInTheDocument(),
    );
    expect(resetUserPassword).toHaveBeenCalledWith("user-1");
  });
});
