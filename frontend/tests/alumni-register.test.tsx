import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
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

describe("alumni registration", () => {
  it("queues the profile-review notification only after registration succeeds", async () => {
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
    fireEvent.click(
      screen.getByRole("button", { name: "Create Alumni Account" }),
    );

    await waitFor(() => expect(register).toHaveBeenCalledOnce());
    expect(sessionStorage.getItem("rams_alumni_registration_notice")).toBe(
      "Account created successfully. Please complete your alumni profile. Your profile will be reviewed by an administrator before publication.",
    );
    expect(replace).toHaveBeenCalledWith("/alumni/dashboard");
  });
});
