import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Alumni } from "@/types/alumni";

const { getAlumniById, reviewAlumni, setAlumniActive, updateAlumni } =
  vi.hoisted(() => ({
    getAlumniById: vi.fn(),
    reviewAlumni: vi.fn(),
    setAlumniActive: vi.fn(),
    updateAlumni: vi.fn(),
  }));

vi.mock("@/lib/api/alumni", () => ({
  getAlumniById,
  reviewAlumni,
  setAlumniActive,
  updateAlumni,
}));
vi.mock("@/lib/api/modules", () => ({
  getTrackingByAlumniId: vi.fn().mockResolvedValue([]),
}));
vi.mock("@/components/providers/auth-providers", () => ({
  useAuth: () => ({ user: { role: "ADMIN" }, status: "authenticated" }),
}));
vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "alumni-1" }),
  useRouter: () => ({ replace: vi.fn() }),
}));
vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children?: React.ReactNode;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));
vi.mock("next/image", () => ({
  default: ({ alt, ...props }: { alt: string; [key: string]: unknown }) => (
    <img alt={alt} {...props} />
  ),
}));

import AlumniDetail from "@/components/dashboard/alumni-detail";

const pendingProfile: Alumni = {
  _id: "alumni-1",
  userId: "user-1",
  fullName: "Half Filled Alumni",
  nim: "NIM-34",
  angkatan: 34,
  program: "Naval Architecture",
  photo: "https://example.com/p.jpg",
  currentStatus: "WORKING",
  careerHistory: [],
  educationHistory: [],
  isPublic: false,
  reviewStatus: "PENDING",
  profileCompleted: true,
  accountEmail: "alumni@test.local",
  accountActive: true,
  createdAt: "2024-01-01",
  updatedAt: "2024-01-01",
} as unknown as Alumni;

async function openRejectModal() {
  const rejectButton = await screen.findByRole("button", { name: /^reject$/i });
  fireEvent.click(rejectButton);
  return screen.getByRole("dialog");
}

beforeEach(() => {
  vi.clearAllMocks();
  getAlumniById.mockResolvedValue(pendingProfile);
});

describe("Reject alumni modal", () => {
  it("opens a modal with a required reason textarea", async () => {
    render(<AlumniDetail id="alumni-1" />);

    const dialog = await openRejectModal();

    expect(dialog).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Reject Alumni Profile" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Reason")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Reject profile" }),
    ).toBeInTheDocument();
    expect(reviewAlumni).not.toHaveBeenCalled();
  });

  it("shows a validation error instead of calling the API for an empty reason", async () => {
    render(<AlumniDetail id="alumni-1" />);

    await openRejectModal();

    fireEvent.click(screen.getByRole("button", { name: "Reject profile" }));

    expect(
      await screen.findByText("Rejection reason is required."),
    ).toBeInTheDocument();
    expect(reviewAlumni).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("treats a whitespace-only reason as empty", async () => {
    render(<AlumniDetail id="alumni-1" />);

    await openRejectModal();

    fireEvent.change(screen.getByLabelText("Reason"), {
      target: { value: "   \n\t  " },
    });
    fireEvent.click(screen.getByRole("button", { name: "Reject profile" }));

    expect(
      await screen.findByText("Rejection reason is required."),
    ).toBeInTheDocument();
    expect(reviewAlumni).not.toHaveBeenCalled();
  });

  it("sends the trimmed reason to the API and closes on success", async () => {
    reviewAlumni.mockResolvedValue({
      ...pendingProfile,
      reviewStatus: "REJECTED",
      isPublic: false,
      reviewNote: "Company name and position are missing.",
    });

    render(<AlumniDetail id="alumni-1" />);

    await openRejectModal();

    fireEvent.change(screen.getByLabelText("Reason"), {
      target: { value: "  Company name and position are missing.  " },
    });
    fireEvent.click(screen.getByRole("button", { name: "Reject profile" }));

    await waitFor(() =>
      expect(reviewAlumni).toHaveBeenCalledWith(
        "alumni-1",
        "REJECT",
        "Company name and position are missing.",
      ),
    );

    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    expect(screen.getByText("Rejected")).toBeInTheDocument();
  });

  it("does not open the modal when cancelling", async () => {
    render(<AlumniDetail id="alumni-1" />);

    await openRejectModal();

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(reviewAlumni).not.toHaveBeenCalled();
  });
});
