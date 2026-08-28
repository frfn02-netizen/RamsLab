import { fireEvent, render, screen, waitFor, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import DosenPage from "@/app/dashboard/dosen/page";
import StudentsPage from "@/app/dashboard/students/page";

const mocks = vi.hoisted(() => ({ getDosenList: vi.fn(), deleteDosen: vi.fn(), getStudentList: vi.fn(), deleteStudent: vi.fn(), auth: { role: "ADMIN" as string } }));
vi.mock("@/lib/api/modules", () => mocks);
vi.mock("@/components/providers/auth-providers", () => ({ useAuth: () => ({ user: { role: mocks.auth.role }, status: "authenticated" }) }));

const dosen = { _id: "dosen-1", fullName: "Dr. Sea Lecturer", specialization: ["Reliability"], isPublic: true };
const student = { _id: "student-1", fullName: "Marine Student", studentType: "PHD_STUDENT", specialization: [], isPublic: true };

afterEach(() => { cleanup(); mocks.getDosenList.mockReset(); mocks.deleteDosen.mockReset(); mocks.getStudentList.mockReset(); mocks.deleteStudent.mockReset(); vi.restoreAllMocks(); });

describe("Admin People list deletion", () => {
  it("deletes the selected Dosen after confirmation", async () => {
    mocks.getDosenList.mockResolvedValue([dosen]); mocks.deleteDosen.mockResolvedValue(undefined);
    render(<DosenPage />); await waitFor(() => expect(screen.getByText("Dr. Sea Lecturer")).toBeInTheDocument()); fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(screen.getByRole("dialog")).toHaveTextContent("Dr. Sea Lecturer"); fireEvent.click(screen.getByRole("dialog").querySelector("button.bg-red-700")!); await waitFor(() => expect(mocks.deleteDosen).toHaveBeenCalledWith("dosen-1")); expect(screen.queryByText("Dr. Sea Lecturer")).not.toBeInTheDocument();
  });

  it("does not delete a Student when confirmation is cancelled", async () => {
    mocks.getStudentList.mockResolvedValue([student]);
    render(<StudentsPage />); await waitFor(() => expect(screen.getByText("Marine Student")).toBeInTheDocument()); fireEvent.click(screen.getByRole("button", { name: "Delete" })); fireEvent.click(screen.getByRole("dialog").querySelector("button")!);
    expect(mocks.deleteStudent).not.toHaveBeenCalled(); expect(screen.getByText("Marine Student")).toBeInTheDocument();
  });

  it("keeps a Student row when deletion fails", async () => {
    mocks.getStudentList.mockResolvedValue([student]); mocks.deleteStudent.mockRejectedValue(new Error("Delete failed"));
    render(<StudentsPage />); await waitFor(() => expect(screen.getByText("Marine Student")).toBeInTheDocument()); fireEvent.click(screen.getByRole("button", { name: "Delete" })); fireEvent.click(screen.getByRole("dialog").querySelector("button.bg-red-700")!);
    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument()); expect(screen.getByText("Marine Student")).toBeInTheDocument();
  });
});
