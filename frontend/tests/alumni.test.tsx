import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AlumniPage from "@/app/dashboard/alumni/page";
import type { Alumni } from "@/types/alumni";

const { getAlumniList } = vi.hoisted(() => ({ getAlumniList: vi.fn() }));
vi.mock("@/lib/api/alumni", () => ({ getAlumniList }));
vi.mock("@/components/providers/auth-providers", () => ({ useAuth: () => ({ user: { role: "DOSEN" }, status: "authenticated" }) }));

const record: Alumni = { _id: "alumni-1", userId: "user-1", fullName: "Marine Researcher", nim: "NIM-1", graduationYear: 2024, program: "Marine Engineering", currentStatus: "WORKING", currentCompany: "RAMS Lab", currentPosition: "Engineer", careerHistory: [], educationHistory: [], isPublic: true, createdAt: "2024-01-01", updatedAt: "2024-01-01" };

describe("Alumni list", () => {
  it("renders real API data and keeps the search control mounted", async () => {
    getAlumniList.mockResolvedValue({ data: [record], total: 1 });
    render(<AlumniPage />);
    expect(screen.getByRole("searchbox", { name: "Search alumni" })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("Marine Researcher")).toBeInTheDocument());
    expect(getAlumniList).toHaveBeenCalledWith({ page: 1, limit: 10, search: "" });
    expect(screen.queryByRole("link", { name: "Add alumni" })).not.toBeInTheDocument();
  });
});
