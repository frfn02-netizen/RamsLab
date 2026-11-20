import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AlumniPage from "@/app/dashboard/alumni/page";
import { ToastProvider } from "@/components/providers/toast-providers";
import type { Alumni } from "@/types/alumni";

const { getAlumniList, getAlumniStats, deleteAlumni, auth } = vi.hoisted(
  () => ({
    getAlumniList: vi.fn(),
    getAlumniStats: vi.fn(),
    deleteAlumni: vi.fn(),
    auth: { role: "DOSEN" as string },
  }),
);
vi.mock("@/lib/api/alumni", () => ({
  getAlumniList,
  getAlumniStats,
  deleteAlumni,
}));
vi.mock("@/components/providers/auth-providers", () => ({
  useAuth: () => ({ user: { role: auth.role }, status: "authenticated" }),
}));

const record: Alumni = {
  _id: "alumni-1",
  userId: "user-1",
  fullName: "Marine Researcher",
  nim: "NIM-1",
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
  getAlumniStats.mockResolvedValue({
    total: 1,
    approved: 0,
    pending: 1,
    rejected: 0,
  });
});

afterEach(() => {
  auth.role = "DOSEN";
  getAlumniList.mockReset();
  getAlumniStats.mockReset();
  deleteAlumni.mockReset();
  vi.restoreAllMocks();
});

function renderAlumniPage() {
  return render(
    <ToastProvider>
      <AlumniPage />
    </ToastProvider>,
  );
}

describe("Alumni list", () => {
  it("confirms and deletes the selected alumni", async () => {
    auth.role = "ADMIN";
    getAlumniList.mockResolvedValue({ data: [record], total: 1 });
    deleteAlumni.mockResolvedValue(undefined);
    renderAlumniPage();
    await waitFor(() =>
      expect(screen.getByText("Marine Researcher")).toBeInTheDocument(),
    );
    expect(screen.getByRole("link", { name: "Edit" })).toHaveAttribute(
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

  it("renders the alumni statistics cards from the API", async () => {
    getAlumniStats.mockResolvedValue({
      total: 128,
      approved: 86,
      pending: 30,
      rejected: 12,
    });
    getAlumniList.mockResolvedValue({ data: [], total: 0 });

    renderAlumniPage();

    const region = await screen.findByRole("region", {
      name: "Alumni statistics",
    });

    expect(within(region).getByText("128")).toBeInTheDocument();
    expect(within(region).getByText("Total Alumni")).toBeInTheDocument();
    expect(within(region).getByText("86")).toBeInTheDocument();
    expect(within(region).getByText("Approved")).toBeInTheDocument();
    expect(within(region).getByText("30")).toBeInTheDocument();
    expect(within(region).getByText("Pending")).toBeInTheDocument();
    expect(within(region).getByText("12")).toBeInTheDocument();
    expect(within(region).getByText("Rejected")).toBeInTheDocument();
  });

  it("shows a retry state when statistics cannot be loaded", async () => {
    getAlumniStats.mockRejectedValueOnce(new Error("Stats failed"));
    getAlumniList.mockResolvedValue({ data: [], total: 0 });

    renderAlumniPage();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Something went wrong. Please try again.",
    );

    getAlumniStats.mockResolvedValueOnce({
      total: 3,
      approved: 1,
      pending: 1,
      rejected: 1,
    });

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));

    await waitFor(() =>
      expect(screen.getByText("Total Alumni")).toBeInTheDocument(),
    );
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("does nothing when deletion is cancelled", async () => {
    auth.role = "ADMIN";
    deleteAlumni.mockClear();
    getAlumniList.mockResolvedValue({ data: [record], total: 1 });
    renderAlumniPage();
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
    renderAlumniPage();
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
    renderAlumniPage();
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

  it("does not render admin create-alumni actions for an admin", async () => {
    auth.role = "ADMIN";
    getAlumniList.mockResolvedValue({ data: [], total: 0 });
    renderAlumniPage();
    await waitFor(() =>
      expect(
        screen.getByText("There are no alumni records available yet."),
      ).toBeInTheDocument(),
    );
    expect(
      screen.queryByRole("link", { name: "Add alumni" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Create the first profile" }),
    ).not.toBeInTheDocument();
  });

  it("shows the review state and the missing publish fields per row", async () => {
    const approved: Alumni = {
      ...record,
      _id: "alumni-approved",
      fullName: "Approved Alum",
      photo: "https://example.com/approved.jpg",
      reviewStatus: "APPROVED",
      isPublic: true,
    };
    const pending: Alumni = {
      ...record,
      _id: "alumni-pending",
      fullName: "Pending Alum",
      nim: "",
      program: "",
      photo: undefined,
      reviewStatus: undefined,
      isPublic: false,
    };
    getAlumniList.mockResolvedValue({
      data: [approved, pending],
      total: 2,
    });
    renderAlumniPage();

    await waitFor(() =>
      expect(screen.getByText("Approved Alum")).toBeInTheDocument(),
    );
    expect(screen.getByText("Pending Alum")).toBeInTheDocument();

    // Scoped to the table: the page also renders an "Approved" filter button.
    const table = screen.getByRole("table");
    expect(within(table).getByText("Approved")).toBeInTheDocument();
    expect(within(table).getByText("Public")).toBeInTheDocument();
    expect(within(table).getByText("Pending review")).toBeInTheDocument();
    expect(within(table).getByText("Private")).toBeInTheDocument();
    expect(
      within(table).getByText("Missing: program, NIM, photo"),
    ).toBeInTheDocument();
    expect(within(table).queryByText("Complete")).not.toBeInTheDocument();
    expect(within(table).queryByText("Incomplete")).not.toBeInTheDocument();
  });
});
