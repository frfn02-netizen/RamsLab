import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AlumniRegisterPage from "@/app/alumni/register/page";

const { replace, register } = vi.hoisted(() => ({
  replace: vi.fn(),
  register: vi.fn(),
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));
vi.mock("next/link", () => ({
  default: ({ children, ...props }: React.ComponentProps<"a">) => (
    <a {...props}>{children}</a>
  ),
}));
vi.mock("@/components/providers/auth-providers", () => ({
  useAuth: () => ({ user: null, status: "unauthenticated", register }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  window.sessionStorage.clear();
});

describe("alumni registration", () => {
  it("queues the profile-review notification only after registration succeeds", async () => {
    register.mockResolvedValue({ role: "ALUMNI" });
    render(<AlumniRegisterPage />);

    fireEvent.change(screen.getByLabelText("Full Name"), {
      target: { value: "New Alumni" },
    });
    fireEvent.change(screen.getByLabelText("Tahun Angkatan"), {
      target: { value: "2015" },
    });
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "new.alumni@example.test" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "password123" },
    });
    fireEvent.change(screen.getByLabelText("Confirm Password"), {
      target: { value: "password123" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Create Alumni Account" }),
    );

    await waitFor(() => expect(register).toHaveBeenCalledOnce());
    expect(register).toHaveBeenCalledWith(
      expect.objectContaining({ tahunAngkatan: 2015 }),
    );
    expect(sessionStorage.getItem("rams_alumni_registration_notice")).toBe(
      "Account created successfully. Please complete your alumni profile. Your profile will be reviewed by an administrator before publication.",
    );
    expect(replace).toHaveBeenCalledWith("/alumni/dashboard");
  });

  it("blocks submission without Tahun Angkatan", async () => {
    register.mockResolvedValue({ role: "ALUMNI" });
    render(<AlumniRegisterPage />);

    fireEvent.change(screen.getByLabelText("Full Name"), {
      target: { value: "New Alumni" },
    });
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "new.alumni@example.test" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "password123" },
    });
    fireEvent.change(screen.getByLabelText("Confirm Password"), {
      target: { value: "password123" },
    });

    const yearField = screen.getByLabelText("Tahun Angkatan");
    expect(yearField).toBeInvalid();

    fireEvent.click(
      screen.getByRole("button", { name: "Create Alumni Account" }),
    );

    // The empty required field stops the submit: no account is created and
    // the user is never redirected.
    expect(register).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
  });

  it("rejects a Tahun Angkatan outside the P-compatible range", async () => {
    register.mockResolvedValue({ role: "ALUMNI" });
    render(<AlumniRegisterPage />);

    fireEvent.change(screen.getByLabelText("Full Name"), {
      target: { value: "New Alumni" },
    });
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "new.alumni@example.test" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "password123" },
    });
    fireEvent.change(screen.getByLabelText("Confirm Password"), {
      target: { value: "password123" },
    });

    for (const value of ["1960", "2060", "2015.5"]) {
      fireEvent.change(screen.getByLabelText("Tahun Angkatan"), {
        target: { value },
      });
      fireEvent.click(
        screen.getByRole("button", { name: "Create Alumni Account" }),
      );
      expect(screen.getByLabelText("Tahun Angkatan")).toBeInvalid();
    }

    expect(register).not.toHaveBeenCalled();
  });
});
