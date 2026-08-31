import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import AlumniPage from "@/app/dashboard/alumni/page";
import type { Alumni } from "@/types/alumni";

const { getAlumniList, deleteAlumni, auth } = vi.hoisted(() => ({
  getAlumniList: vi.fn(),
  deleteAlumni: vi.fn(),
  auth: { role: "DOSEN" as string },
}));
vi.mock("@/lib/api/alumni", () => ({ getAlumniList, deleteAlumni }));
vi.mock("@/components/providers/auth-providers", () => ({
  useAuth: () => ({ user: { role: auth.role }, status: "authenticated" }),
}));

const record: Alumni = {
  _id: "alumni-1",
  userId: "user-1",
  fullName: "Marine Researcher",
  nim: "NIM-1",
  graduationYear: 2024,
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

afterEach(() => {
  auth.role = "DOSEN";
  getAlumniList.mockReset();
  deleteAlumni.mockReset();
  vi.restoreAllMocks();
});

describe("Alumni list", () => {
  it("confirms and deletes the selected alumni", async () => {
    auth.role = "ADMIN";
    getAlumniList.mockResolvedValue({ data: [record], total: 1 });
    deleteAlumni.mockResolvedValue(undefined);
    render(<AlumniPage />);
    await waitFor(() =>
      expect(screen.getByText("Marine Researcher")).toBeInTheDocument(),
    );
    expect(screen.getByRole("link", { name: "View" })).toHaveAttribute(
      "href",
      "/dashboard/alumni/alumni-1",
    );
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(screen.getByRole("dialog")).toHaveTextContent("Marine Researcher");
    fireEvent.click(
      screen.getByRole("dialog").querySelector("button.bg-red-700")!,
    );
    await waitFor(() => expect(deleteAlumni).toHaveBeenCalledWith("alumni-1"));
    expect(screen.queryByText("Marine Researcher")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(
      "Marine Researcher was deleted successfully.",
    );
  });

  it("does nothing when deletion is cancelled", async () => {
    auth.role = "ADMIN";
    deleteAlumni.mockClear();
    getAlumniList.mockResolvedValue({ data: [record], total: 1 });
    render(<AlumniPage />);
    await waitFor(() =>
      expect(screen.getByText("Marine Researcher")).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    fireEvent.click(screen.getByRole("dialog").querySelector("button")!);
    expect(deleteAlumni).not.toHaveBeenCalled();
    expect(screen.getByText("Marine Researcher")).toBeInTheDocument();
  });

  it("keeps the row and shows an error when deletion fails", async () => {
    auth.role = "ADMIN";
    getAlumniList.mockResolvedValue({ data: [record], total: 1 });
    deleteAlumni.mockRejectedValue(new Error("Delete failed"));
    render(<AlumniPage />);
    await waitFor(() =>
      expect(screen.getByText("Marine Researcher")).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    fireEvent.click(
      screen.getByRole("dialog").querySelector("button.bg-red-700")!,
    );
    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Something went wrong. Please try again.",
    );
    expect(screen.getByText("Marine Researcher")).toBeInTheDocument();
  });

  it("renders real API data and keeps the search control mounted", async () => {
    getAlumniList.mockResolvedValue({ data: [record], total: 1 });
    render(<AlumniPage />);
    expect(
      screen.getByRole("searchbox", { name: "Search alumni" }),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByText("Marine Researcher")).toBeInTheDocument(),
    );
    expect(getAlumniList).toHaveBeenCalledWith({
      page: 1,
      limit: 10,
      search: "",
    });
    expect(
      screen.queryByRole("link", { name: "Add alumni" }),
    ).not.toBeInTheDocument();
  });
});
