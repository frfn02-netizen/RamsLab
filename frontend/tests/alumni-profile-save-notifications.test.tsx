import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Alumni } from "@/types/alumni";

const { getMyAlumni, updateMyAlumni, uploadMyAlumniPhoto, auth } = vi.hoisted(
  () => ({
    getMyAlumni: vi.fn(),
    updateMyAlumni: vi.fn(),
    uploadMyAlumniPhoto: vi.fn(),
    auth: { role: "ALUMNI" as string, email: "test@example.com" },
  }),
);

vi.mock("@/lib/api/alumni", () => ({
  getMyAlumni,
  updateMyAlumni,
  uploadMyAlumniPhoto,
}));
vi.mock("@/components/providers/auth-providers", () => ({
  useAuth: () => ({
    user: { role: auth.role, email: auth.email },
    status: "authenticated",
    logout: vi.fn(),
  }),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
}));
vi.mock("next/image", () => ({
  default: (props: any) => <img {...props} />,
}));
vi.mock("@/components/dashboard/profile-photo-field", () => ({
  default: ({ onFileChange }: { onFileChange: (f: File | null) => void }) => (
    <div data-testid="profile-photo-field">
      <input
        type="file"
        aria-label="Profile photo"
        onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
      />
    </div>
  ),
}));

import AlumniProfile from "@/components/profile/alumni-profile";

const existingProfile: Alumni = {
  _id: "alumni-1",
  userId: "user-1",
  fullName: "Jane Smith",
  nim: "NIM-001",
  angkatan: 24,
  program: "Marine Engineering",
  currentStatus: "WORKING",
  currentCompany: "RAMS Lab",
  currentPosition: "Engineer",
  careerHistory: [],
  educationHistory: [],
  isPublic: true,
  createdAt: "2024-01-01",
  updatedAt: "2024-01-01",
};

beforeEach(() => {
  auth.role = "ALUMNI";
});

describe("AlumniProfile – save notifications", () => {
  it("shows 'Profile completed successfully' for first-time profile save", async () => {
    getMyAlumni.mockRejectedValue(new Error("Not found"));
    updateMyAlumni.mockResolvedValue({ ...existingProfile, _id: "new-1" });

    render(<AlumniProfile />);

    await waitFor(() =>
      expect(screen.getByLabelText(/full name/i)).toBeInTheDocument(),
    );

    fireEvent.change(screen.getByLabelText(/full name/i), {
      target: { value: "New Alumni" },
    });
    fireEvent.change(screen.getByLabelText(/nim/i), {
      target: { value: "NIM-NEW" },
    });
    fireEvent.change(screen.getByLabelText(/angkatan/i), {
      target: { value: "25" },
    });
    fireEvent.change(screen.getByLabelText(/status/i), {
      target: { value: "WORKING" },
    });

    fireEvent.click(screen.getByRole("button", { name: /save profile/i }));

    await waitFor(() =>
      expect(
        screen.getByText("Profile completed successfully"),
      ).toBeInTheDocument(),
    );
  });

  it("shows 'Profile updated successfully' for existing profile save", async () => {
    getMyAlumni.mockResolvedValue(existingProfile);
    updateMyAlumni.mockResolvedValue(existingProfile);

    render(<AlumniProfile />);

    await waitFor(() =>
      expect(screen.getByDisplayValue("Jane Smith")).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByRole("button", { name: /save profile/i }));

    await waitFor(() =>
      expect(
        screen.getByText("Profile updated successfully"),
      ).toBeInTheDocument(),
    );
  });

  it("shows error notification when save fails", async () => {
    getMyAlumni.mockResolvedValue(existingProfile);
    updateMyAlumni.mockRejectedValue(new Error("Server error"));

    render(<AlumniProfile />);

    await waitFor(() =>
      expect(screen.getByDisplayValue("Jane Smith")).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByRole("button", { name: /save profile/i }));

    await waitFor(() => {
      const alerts = screen.getAllByRole("alert");
      expect(alerts.some((el) => el.textContent?.includes("try again"))).toBe(
        true,
      );
    });
  });

  it("does not show success notification when save fails", async () => {
    getMyAlumni.mockResolvedValue(existingProfile);
    updateMyAlumni.mockRejectedValue(new Error("Server error"));

    render(<AlumniProfile />);

    await waitFor(() =>
      expect(screen.getByDisplayValue("Jane Smith")).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByRole("button", { name: /save profile/i }));

    await waitFor(() => expect(updateMyAlumni).toHaveBeenCalled());

    expect(
      screen.queryByText("Profile updated successfully"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("Profile completed successfully"),
    ).not.toBeInTheDocument();
  });

  it("disables the save button while saving to prevent duplicate submissions", async () => {
    getMyAlumni.mockResolvedValue(existingProfile);
    let resolveSave!: (v: Alumni) => void;
    updateMyAlumni.mockReturnValue(
      new Promise<Alumni>((resolve) => {
        resolveSave = resolve;
      }),
    );

    render(<AlumniProfile />);

    await waitFor(() =>
      expect(screen.getByDisplayValue("Jane Smith")).toBeInTheDocument(),
    );

    const saveButton = screen.getByRole("button", { name: /save profile/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(saveButton).toBeDisabled();
      expect(saveButton).toHaveTextContent("Saving…");
    });

    resolveSave(existingProfile);

    await waitFor(() => {
      expect(saveButton).not.toBeDisabled();
    });
  });
});
