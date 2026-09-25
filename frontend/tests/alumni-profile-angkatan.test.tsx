import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Alumni } from "@/types/alumni";

const { getMyAlumni, updateMyAlumni, uploadMyAlumniPhoto, stableUser } =
  vi.hoisted(() => ({
    getMyAlumni: vi.fn(),
    updateMyAlumni: vi.fn(),
    uploadMyAlumniPhoto: vi.fn(),
    // A stable object keeps the profile effect from re-running on every
    // render (the component depends on the user identity).
    stableUser: { role: "ALUMNI", email: "alumni@test.local" },
  }));

vi.mock("@/lib/api/alumni", () => ({
  getMyAlumni,
  updateMyAlumni,
  uploadMyAlumniPhoto,
}));
vi.mock("@/components/providers/auth-providers", () => ({
  useAuth: () => ({
    user: stableUser,
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

const baseProfile: Alumni = {
  _id: "alumni-1",
  userId: "user-1",
  fullName: "Batch Thirty Four",
  nim: "NIM-034",
  angkatan: 34,
  program: "Naval Architecture",
  currentStatus: "WORKING",
  careerHistory: [],
  educationHistory: [],
  isPublic: false,
  reviewStatus: "PENDING",
  profileCompleted: true,
  createdAt: "2024-01-01",
  updatedAt: "2024-01-01",
};

const emptyShell = {
  ...baseProfile,
  fullName: "",
  nim: "",
  program: "",
  angkatan: undefined,
  photo: undefined,
  profileCompleted: false,
} as unknown as Alumni;

function angkatanValue() {
  return (screen.getByLabelText(/angkatan/i) as HTMLInputElement).value;
}

async function fillAndSave(payload: Record<string, unknown>) {
  fireEvent.change(screen.getByLabelText(/full name/i), {
    target: { value: String(payload.fullName ?? "") },
  });
  fireEvent.change(screen.getByLabelText(/program/i), {
    target: { value: String(payload.program ?? "") },
  });
  fireEvent.change(screen.getByLabelText(/nim/i), {
    target: { value: String(payload.nim ?? "") },
  });
  fireEvent.change(screen.getByLabelText(/angkatan/i), {
    target: { value: String(payload.angkatan ?? "") },
  });
  fireEvent.change(screen.getByLabelText(/status/i), {
    target: { value: "WORKING" },
  });
  fireEvent.click(screen.getByRole("button", { name: /save profile/i }));
  await waitFor(() => expect(updateMyAlumni).toHaveBeenCalled());
}

beforeEach(() => {
  vi.clearAllMocks();
  stableUser.role = "ALUMNI";
});

describe("Angkatan (batch number) round trip", () => {
  it("renders the stored batch number when the form is opened", async () => {
    getMyAlumni.mockResolvedValue(baseProfile);

    render(<AlumniProfile />);

    await waitFor(() => expect(angkatanValue()).toBe("34"));
    expect(getMyAlumni).toHaveBeenCalledTimes(1);
  });

  it("sends the typed batch number and shows it again after reopening the form", async () => {
    getMyAlumni.mockResolvedValueOnce(emptyShell);
    updateMyAlumni.mockResolvedValue({
      ...baseProfile,
      fullName: "Batch Thirty Four",
    });

    const first = render(<AlumniProfile />);
    await waitFor(() => expect(angkatanValue()).toBe(""));

    await fillAndSave({
      fullName: "Batch Thirty Four",
      program: "Naval Architecture",
      nim: "NIM-034",
      angkatan: 34,
    });

    expect(updateMyAlumni.mock.calls[0][0].angkatan).toBe(34);
    first.unmount();

    // Reopening the form re-reads the profile from the backend.
    getMyAlumni.mockResolvedValueOnce({
      ...baseProfile,
      fullName: "Batch Thirty Four",
    });

    render(<AlumniProfile />);
    await waitFor(() => expect(angkatanValue()).toBe("34"));
    expect(screen.getByDisplayValue("Naval Architecture")).toBeInTheDocument();
    expect(screen.getByDisplayValue("NIM-034")).toBeInTheDocument();
  });

  it("keeps the stored batch number when a later save cannot change it", async () => {
    getMyAlumni.mockResolvedValue(baseProfile);
    updateMyAlumni.mockResolvedValue(baseProfile);

    render(<AlumniProfile />);
    await waitFor(() => expect(angkatanValue()).toBe("34"));

    fireEvent.change(screen.getByLabelText(/angkatan/i), {
      target: { value: "99" },
    });
    fireEvent.click(screen.getByRole("button", { name: /save profile/i }));

    await waitFor(() => expect(updateMyAlumni).toHaveBeenCalled());
    // The form is re-synced from the response, so it never shows a value the
    // backend refused to store.
    await waitFor(() => expect(angkatanValue()).toBe("34"));
  });
});
