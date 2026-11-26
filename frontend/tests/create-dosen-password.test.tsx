import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CreateDosen from "@/components/dashboard/create-dosen";

const { createDosen, uploadDosenPhoto, resetUserPassword, notifyError } =
  vi.hoisted(() => ({
    createDosen: vi.fn(),
    uploadDosenPhoto: vi.fn(),
    resetUserPassword: vi.fn(),
    notifyError: vi.fn(),
  }));

vi.mock("@/lib/api/modules", () => ({
  createDosen,
  uploadDosenPhoto,
  resetUserPassword,
}));
vi.mock("@/components/providers/toast-providers", () => ({
  useToast: () => ({ success: vi.fn(), error: notifyError }),
}));

beforeEach(() => {
  createDosen.mockReset();
  uploadDosenPhoto.mockReset();
  resetUserPassword.mockReset();
  notifyError.mockReset();

  createDosen.mockResolvedValue({
    dosen: {
      _id: "dosen-1",
      userId: "user-1",
      email: "dosen@test.local",
    },
    temporaryPassword: "TempPass123!",
  });
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
    expect(
      screen.queryByText(/Onboarding email/i),
    ).not.toBeInTheDocument();
    expect(createDosen).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Hide password" }));
    expect(screen.queryByText("TempPass123!")).not.toBeInTheDocument();
    expect(screen.getByText("••••••••")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Show password" }));
    expect(screen.getByText("TempPass123!")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Clear password" }));
    expect(screen.queryByText("TempPass123!")).not.toBeInTheDocument();
    expect(screen.getByText("Temporary password cleared")).toBeInTheDocument();

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

  it("keeps the public profile off by default and never mentions onboarding email", async () => {
    createDosen.mockResolvedValue({
      dosen: {
        _id: "dosen-2",
        userId: "user-2",
        email: "failed@test.local",
      },
      temporaryPassword: "TempPass789!",
    });

    const { container } = render(<CreateDosen />);
    const publicToggle = screen.getByRole("checkbox", {
      name: "Show public profile",
    });
    expect(publicToggle).not.toBeChecked();

    fireEvent.submit(container.querySelector("form")!);

    await waitFor(() =>
      expect(screen.getByText("Dosen created")).toBeInTheDocument(),
    );
    expect(createDosen).toHaveBeenCalledWith(
      expect.objectContaining({ isPublic: false }),
    );
    expect(screen.getByText("TempPass789!")).toBeInTheDocument();
    expect(
      screen.queryByText(/Onboarding email/i),
    ).not.toBeInTheDocument();
    expect(notifyError).not.toHaveBeenCalled();
  });
});
