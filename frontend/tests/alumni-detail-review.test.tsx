import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Alumni } from "@/types/alumni";

const { getAlumniById, reviewAlumni, setAlumniActive, updateAlumni, auth } =
  vi.hoisted(() => ({
    getAlumniById: vi.fn(),
    reviewAlumni: vi.fn(),
    setAlumniActive: vi.fn(),
    updateAlumni: vi.fn(),
    auth: { role: "ADMIN" as string },
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
  useAuth: () => ({ user: { role: auth.role }, status: "authenticated" }),
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
import { ApiError } from "@/lib/api/errors";

const pendingProfile: Alumni = {
  _id: "alumni-1",
  userId: "user-1",
  fullName: "Half Filled Alumni",
  nim: "",
  angkatan: 34,
  program: "",
  currentStatus: "WORKING",
  careerHistory: [],
  educationHistory: [],
  isPublic: false,
  reviewStatus: "PENDING",
  profileCompleted: false,
  accountEmail: "alumni@test.local",
  accountActive: true,
  createdAt: "2024-01-01",
  updatedAt: "2024-01-01",
} as unknown as Alumni;

beforeEach(() => {
  vi.clearAllMocks();
  auth.role = "ADMIN";
});

describe("Alumni detail – review state", () => {
  it("keeps the review status as the main state and explains what is missing", async () => {
    getAlumniById.mockResolvedValue(pendingProfile);

    render(<AlumniDetail id="alumni-1" />);

    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: "Half Filled Alumni" }),
      ).toBeInTheDocument(),
    );

    expect(screen.getByText("Pending review")).toBeInTheDocument();
    expect(screen.queryByText("Incomplete")).not.toBeInTheDocument();
    expect(screen.queryByText("Complete")).not.toBeInTheDocument();

    const gap = screen.getByText(/Missing before publish/i);
    expect(gap).toHaveTextContent("NIM");
    expect(gap).toHaveTextContent("photo");
    expect(gap).toHaveTextContent("program");
    expect(gap).not.toHaveTextContent("angkatan");
    expect(gap).not.toHaveTextContent("full name");
  });

  it("does not block the approve button on the client and surfaces the server refusal", async () => {
    getAlumniById.mockResolvedValue(pendingProfile);
    reviewAlumni.mockRejectedValue(
      new ApiError(
        "Cannot publish this profile yet: missing NIM, program, photo.",
        400,
      ),
    );

    render(<AlumniDetail id="alumni-1" />);

    const approveButton = await screen.findByRole("button", {
      name: /approve & publish/i,
    });
    expect(approveButton).toBeEnabled();

    fireEvent.click(approveButton);

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Cannot publish this profile yet: missing NIM, program, photo.",
      ),
    );
    expect(reviewAlumni).toHaveBeenCalledWith("alumni-1", "APPROVE");
  });

  it("publishes a complete profile once the backend approves it", async () => {
    getAlumniById.mockResolvedValue(pendingProfile);
    reviewAlumni.mockResolvedValue({
      ...pendingProfile,
      program: "Naval Architecture",
      nim: "NIM-34",
      photo: "https://example.com/p.jpg",
      reviewStatus: "APPROVED",
      isPublic: true,
      profileCompleted: true,
    });

    render(<AlumniDetail id="alumni-1" />);

    fireEvent.click(
      await screen.findByRole("button", { name: /approve & publish/i }),
    );

    await waitFor(() =>
      expect(screen.getByText("Approved")).toBeInTheDocument(),
    );
    expect(screen.getAllByText("Public").length).toBeGreaterThan(0);
    expect(
      screen.queryByText(/Missing before publish/i),
    ).not.toBeInTheDocument();
  });
});
