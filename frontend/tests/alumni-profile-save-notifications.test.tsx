import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api/errors";
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
  default: ({ alt, ...props }: { alt: string; [key: string]: unknown }) => (
    <img alt={alt} {...props} />
  ),
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
  it("shows 'Profile completed successfully' when the backend reports the profile complete", async () => {
    getMyAlumni.mockRejectedValue(new Error("Not found"));
    updateMyAlumni.mockResolvedValue({
      ...existingProfile,
      _id: "new-1",
      profileCompleted: true,
    });

    render(<AlumniProfile />);

    await waitFor(() =>
      expect(screen.getByLabelText(/full name/i)).toBeInTheDocument(),
    );

    fireEvent.change(screen.getByLabelText(/full name/i), {
      target: { value: "New Alumni" },
    });
    fireEvent.change(screen.getByLabelText(/program/i), {
      target: { value: "S1 TEKNIK SISTEM PERKAPALAN" },
    });
    fireEvent.change(screen.getByLabelText(/nim/i), {
      target: { value: "NIM-NEW" },
    });
    fireEvent.change(screen.getByLabelText("Tahun Angkatan"), {
      target: { value: "2015" },
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
    expect(
      screen.queryByText("Profile saved. Your profile is pending review."),
    ).not.toBeInTheDocument();

    // The success toast is the existing lime one.
    const toast = screen.getByRole("status");
    expect(toast).toHaveTextContent("Profile completed successfully");
    expect(toast).toHaveTextContent("Success!");
    expect(toast.className).toContain("fixed");
    expect(toast.className).toContain("border-l-lime-500");
  });

  it("does not claim the profile is complete while the backend still reports it incomplete", async () => {
    getMyAlumni.mockResolvedValue(existingProfile);
    updateMyAlumni.mockResolvedValue({
      ...existingProfile,
      profileCompleted: false,
    });

    render(<AlumniProfile />);

    await waitFor(() =>
      expect(screen.getByDisplayValue("Jane Smith")).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByRole("button", { name: /save profile/i }));

    await waitFor(() =>
      expect(
        screen.getByText("Profile saved. Your profile is pending review."),
      ).toBeInTheDocument(),
    );
    expect(
      screen.queryByText("Profile completed successfully"),
    ).not.toBeInTheDocument();
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

    // It is the red error toast, not the inline ErrorState banner.
    const toast = screen.getByRole("alert");
    expect(toast.className).toContain("fixed");
    expect(toast.className).toContain("border-l-red-500");
    expect(document.querySelectorAll(".bg-red-50")).toHaveLength(0);
  });

  const registrationErrors = [
    "Cannot save profile: photo is required to complete your alumni registration.",
    "Cannot save profile: full name is required to complete your alumni registration.",
    "Cannot save profile: angkatan (P) is required to complete your alumni registration.",
  ];

  it.each(registrationErrors)(
    "shows the registration validation error as a dismissible red toast: %s",
    async (message) => {
      getMyAlumni.mockResolvedValue(existingProfile);
      updateMyAlumni.mockRejectedValue(new ApiError(message, 400));

      render(<AlumniProfile />);

      await waitFor(() =>
        expect(screen.getByDisplayValue("Jane Smith")).toBeInTheDocument(),
      );

      fireEvent.click(screen.getByRole("button", { name: /save profile/i }));

      await waitFor(() =>
        expect(screen.getByRole("alert")).toHaveTextContent(message),
      );

      const toast = screen.getByRole("alert");
      expect(toast).toHaveTextContent("Error!");
      expect(toast.className).toContain("fixed");
      expect(toast.className).toContain("border-l-red-500");
      expect(screen.getAllByText(message)).toHaveLength(1);
      expect(document.querySelectorAll(".bg-red-50")).toHaveLength(0);

      fireEvent.click(
        screen.getByRole("button", { name: /dismiss error notification/i }),
      );
      expect(screen.queryByText(message)).not.toBeInTheDocument();
    },
  );

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
      screen.queryByText("Profile saved. Your profile is pending review."),
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

  it("uploads a pending photo before the profile save", async () => {
    // The mock history (and its invocation order) survives between tests, so
    // this one starts from a clean slate before comparing the call order.
    getMyAlumni.mockClear();
    uploadMyAlumniPhoto.mockClear();
    updateMyAlumni.mockClear();

    getMyAlumni.mockResolvedValue(existingProfile);
    uploadMyAlumniPhoto.mockResolvedValue({
      ...existingProfile,
      photo: "https://example.com/new-photo.jpg",
    });
    updateMyAlumni.mockResolvedValue({
      ...existingProfile,
      photo: "https://example.com/new-photo.jpg",
      profileCompleted: true,
    });

    render(<AlumniProfile />);

    await waitFor(() =>
      expect(screen.getByDisplayValue("Jane Smith")).toBeInTheDocument(),
    );

    const file = new File(["photo-bytes"], "profile.png", {
      type: "image/png",
    });
    fireEvent.change(screen.getByLabelText("Profile photo"), {
      target: { files: [file] },
    });

    fireEvent.click(screen.getByRole("button", { name: /save profile/i }));

    await waitFor(() => expect(updateMyAlumni).toHaveBeenCalled());

    // The backend rejects a save that would be stored without a photo, so the
    // photo has to be uploaded first.
    expect(uploadMyAlumniPhoto).toHaveBeenCalledWith(file);
    expect(uploadMyAlumniPhoto.mock.invocationCallOrder[0]).toBeLessThan(
      updateMyAlumni.mock.invocationCallOrder[0],
    );
    expect(
      await screen.findByText("Profile completed successfully"),
    ).toBeInTheDocument();
  });
});
