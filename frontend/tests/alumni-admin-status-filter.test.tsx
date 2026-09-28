import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import AlumniPage from "@/app/dashboard/alumni/page";
import type { Alumni } from "@/types/alumni";

const { getAlumniList, deleteAlumni } = vi.hoisted(() => ({
  getAlumniList: vi.fn(),
  deleteAlumni: vi.fn(),
}));
vi.mock("@/lib/api/alumni", () => ({ getAlumniList, deleteAlumni }));
vi.mock("@/components/providers/auth-providers", () => ({
  useAuth: () => ({ user: { role: "ADMIN" }, status: "authenticated" }),
}));

function record(overrides: Partial<Alumni>): Alumni {
  return {
    _id: "alumni-1",
    userId: "user-1",
    fullName: "Alumni One",
    nim: "NIM-1",
    angkatan: 24,
    program: "Marine Engineering",
    currentStatus: "WORKING",
    careerHistory: [],
    educationHistory: [],
    isPublic: false,
    createdAt: "2024-01-01",
    updatedAt: "2024-01-01",
    ...overrides,
  };
}

afterEach(() => {
  getAlumniList.mockReset();
  deleteAlumni.mockReset();
  vi.restoreAllMocks();
});

describe("Alumni review status filter", () => {
  it("defaults to All and sends no reviewStatus parameter", async () => {
    getAlumniList.mockResolvedValue({
      data: [record({ _id: "alumni-p", fullName: "Pending One" })],
      total: 1,
    });

    render(<AlumniPage />);

    await waitFor(() =>
      expect(screen.getByText("Pending One")).toBeInTheDocument(),
    );

    expect(getAlumniList).toHaveBeenCalledWith({
      page: 1,
      limit: 10,
      search: "",
    });
    expect(screen.getByRole("button", { name: "All" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("requests only PENDING alumni when Pending is selected", async () => {
    getAlumniList.mockResolvedValue({
      data: [record({ _id: "alumni-p", fullName: "Pending One" })],
      total: 1,
    });

    render(<AlumniPage />);

    await waitFor(() =>
      expect(screen.getByText("Pending One")).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByRole("button", { name: "Pending" }));

    await waitFor(() =>
      expect(getAlumniList).toHaveBeenLastCalledWith({
        page: 1,
        limit: 10,
        search: "",
        reviewStatus: "PENDING",
      }),
    );
    expect(screen.getByRole("button", { name: "Pending" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "All" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("requests only REJECTED alumni when Rejected is selected", async () => {
    getAlumniList.mockResolvedValue({
      data: [record({ _id: "alumni-r", fullName: "Rejected One" })],
      total: 1,
    });

    render(<AlumniPage />);

    await waitFor(() =>
      expect(screen.getByText("Rejected One")).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByRole("button", { name: "Rejected" }));

    await waitFor(() =>
      expect(getAlumniList).toHaveBeenLastCalledWith({
        page: 1,
        limit: 10,
        search: "",
        reviewStatus: "REJECTED",
      }),
    );
    expect(screen.getByRole("button", { name: "Rejected" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("requests only APPROVED alumni when Approved is selected", async () => {
    getAlumniList.mockResolvedValue({
      data: [record({ _id: "alumni-a", fullName: "Approved One" })],
      total: 1,
    });

    render(<AlumniPage />);

    await waitFor(() =>
      expect(screen.getByText("Approved One")).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByRole("button", { name: "Approved" }));

    await waitFor(() =>
      expect(getAlumniList).toHaveBeenLastCalledWith({
        page: 1,
        limit: 10,
        search: "",
        reviewStatus: "APPROVED",
      }),
    );
    expect(screen.getByRole("button", { name: "Approved" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("shows the rows of the newly selected filter without a full reload", async () => {
    getAlumniList
      .mockResolvedValueOnce({
        data: [
          record({
            _id: "alumni-approved",
            fullName: "Approved One",
            reviewStatus: "APPROVED",
            isPublic: true,
          }),
        ],
        total: 1,
      })
      .mockResolvedValueOnce({
        data: [
          record({
            _id: "alumni-rejected",
            fullName: "Rejected One",
            reviewStatus: "REJECTED",
            reviewNote: "Please complete your profile.",
          }),
        ],
        total: 1,
      });

    render(<AlumniPage />);

    await waitFor(() =>
      expect(screen.getByText("Approved One")).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByRole("button", { name: "Rejected" }));

    await waitFor(() =>
      expect(screen.getByText("Rejected One")).toBeInTheDocument(),
    );
    expect(screen.queryByText("Approved One")).not.toBeInTheDocument();
    expect(getAlumniList).toHaveBeenCalledTimes(2);
    expect(screen.getByRole("button", { name: "Rejected" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("returns to All without a reviewStatus parameter", async () => {
    getAlumniList.mockResolvedValue({
      data: [record({ _id: "alumni-p", fullName: "Pending One" })],
      total: 1,
    });

    render(<AlumniPage />);

    await waitFor(() =>
      expect(screen.getByText("Pending One")).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByRole("button", { name: "Pending" }));
    await waitFor(() =>
      expect(getAlumniList).toHaveBeenLastCalledWith(
        expect.objectContaining({ reviewStatus: "PENDING" }),
      ),
    );

    fireEvent.click(screen.getByRole("button", { name: "All" }));
    await waitFor(() =>
      expect(getAlumniList).toHaveBeenLastCalledWith({
        page: 1,
        limit: 10,
        search: "",
      }),
    );
    expect(screen.getByRole("button", { name: "All" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });
});
