import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Alumni } from "@/types/alumni";

const { getMyAlumni, updateMyAlumni, uploadMyAlumniPhoto, stableUser } =
  vi.hoisted(() => ({
    getMyAlumni: vi.fn(),
    updateMyAlumni: vi.fn(),
    uploadMyAlumniPhoto: vi.fn(),
    stableUser: { role: "ALUMNI", email: "alumni@test.local" },
  }));

vi.mock("@/lib/api/alumni", () => ({
  getMyAlumni,
  updateMyAlumni,
  uploadMyAlumniPhoto,
}));
vi.mock("@/components/providers/auth-providers", () => ({
  useAuth: () => ({ user: stableUser, status: "authenticated", logout: vi.fn() }),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn() }) }));
vi.mock("next/image", () => ({
  default: ({ alt, ...props }: { alt: string; [key: string]: unknown }) => <img alt={alt} {...props} />,
}));
vi.mock("@/components/dashboard/profile-photo-field", () => ({
  default: () => <div data-testid="profile-photo-field" />,
}));

import AlumniProfile from "@/components/profile/alumni-profile";

const profile: Alumni = {
  _id: "alumni-1",
  userId: "user-1",
  fullName: "Class Alumni",
  nim: "NIM-045",
  angkatan: 45,
  tahunAngkatan: 2005,
  program: "S1 TEKNIK SISTEM PERKAPALAN",
  currentStatus: "WORKING",
  careerHistory: [],
  educationHistory: [],
  isPublic: false,
  reviewStatus: "PENDING",
  profileCompleted: true,
  createdAt: "2024-01-01",
  updatedAt: "2024-01-01",
};

beforeEach(() => vi.clearAllMocks());

describe("Alumni profile cohort year", () => {
  it("renders the six approved program choices", async () => {
    getMyAlumni.mockResolvedValue(profile);
    render(<AlumniProfile />);

    const program = await screen.findByLabelText("Program *");
    expect(program.tagName).toBe("SELECT");
    expect(program.querySelectorAll("option")).toHaveLength(7);
    expect(screen.getByRole("option", { name: "S1 TEKNIK SISTEM PERKAPALAN" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "S1 DOUBLE DEGREE (DD)" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "S2 TEKNIK SISTEM PERKAPALAN" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "S2 DOUBLE DEGREE (DD)" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "S3 TEKNIK SISTEM PERKAPALAN" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "S3 DOUBLE DEGREE (DD)" })).toBeInTheDocument();
  });

  it("displays a legacy program safely and does not resubmit it", async () => {
    const legacyProgram = "Naval Architecture";
    getMyAlumni.mockResolvedValue({ ...profile, program: legacyProgram });
    updateMyAlumni.mockResolvedValue({ ...profile, program: legacyProgram });
    render(<AlumniProfile />);

    const program = await screen.findByLabelText("Program *");
    expect(program).toHaveValue(legacyProgram);
    expect(screen.getByRole("option", { name: `${legacyProgram} (legacy program)` })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /save profile/i }));
    await waitFor(() => expect(updateMyAlumni).toHaveBeenCalledOnce());
    expect(updateMyAlumni.mock.calls[0][0]).not.toHaveProperty("program");
  });

  it("sends an approved replacement for a legacy program and shows the persisted value after reload", async () => {
    const legacyProgram = "Ship Design";
    const replacement = "S1 TEKNIK SISTEM PERKAPALAN";
    getMyAlumni.mockResolvedValueOnce({ ...profile, program: legacyProgram });
    updateMyAlumni.mockResolvedValueOnce({ ...profile, program: replacement });

    const firstView = render(<AlumniProfile />);
    const program = await screen.findByLabelText("Program *");
    expect(program).toHaveValue(legacyProgram);
    fireEvent.change(program, { target: { value: replacement } });
    fireEvent.click(screen.getByRole("button", { name: /save profile/i }));

    await waitFor(() =>
      expect(updateMyAlumni).toHaveBeenCalledWith(
        expect.objectContaining({ program: replacement }),
      ),
    );
    await waitFor(() => expect(program).toHaveValue(replacement));

    firstView.unmount();
    getMyAlumni.mockResolvedValueOnce({ ...profile, program: replacement });
    render(<AlumniProfile />);

    expect(await screen.findByLabelText("Program *")).toHaveValue(replacement);
  });

  it("does not render an editable Angkatan (P) field", async () => {
    getMyAlumni.mockResolvedValue(profile);
    render(<AlumniProfile />);

    await screen.findByLabelText("Tahun Angkatan");
    expect(screen.queryByLabelText(/angkatan \(p\)/i)).toBeNull();
    expect(screen.queryByLabelText(/^angkatan/i)).toBeNull();
  });

  it("does not turn a legacy absent year into null on an unrelated save", async () => {
    getMyAlumni.mockResolvedValue({ ...profile, tahunAngkatan: undefined });
    updateMyAlumni.mockResolvedValue({ ...profile, tahunAngkatan: undefined });
    render(<AlumniProfile />);

    const phone = await screen.findByLabelText("Phone");
    fireEvent.change(phone, { target: { value: "08123456789" } });
    fireEvent.click(screen.getByRole("button", { name: /save profile/i }));

    await waitFor(() => expect(updateMyAlumni).toHaveBeenCalledOnce());
    expect(updateMyAlumni.mock.calls[0][0]).not.toHaveProperty("tahunAngkatan");
  });

  it("saves Tahun Angkatan without submitting a manual P", async () => {
    getMyAlumni.mockResolvedValue({
      ...profile,
      tahunAngkatan: null,
      angkatan: undefined,
    });
    updateMyAlumni.mockResolvedValue({ ...profile, tahunAngkatan: 2005, angkatan: 45 });
    render(<AlumniProfile />);

    const year = await screen.findByLabelText("Tahun Angkatan");
    fireEvent.change(year, { target: { value: "2005" } });
    fireEvent.click(screen.getByRole("button", { name: /save profile/i }));

    await waitFor(() => expect(updateMyAlumni).toHaveBeenCalledOnce());
    expect(updateMyAlumni).toHaveBeenCalledWith(
      expect.objectContaining({ tahunAngkatan: 2005 }),
    );
    expect(updateMyAlumni.mock.calls[0][0]).not.toHaveProperty("angkatan");
  });

  it("keeps a stored year outside 1961..2059 from blocking the form", async () => {
    // Written under the older 1900..2100 contract. `min`/`max` would make the
    // browser refuse the submit entirely, so the bounds must not be applied.
    getMyAlumni.mockResolvedValue({ ...profile, tahunAngkatan: 1955 });
    updateMyAlumni.mockResolvedValue({
      ...profile,
      tahunAngkatan: 1955,
      bio: "Saved.",
    });
    render(<AlumniProfile />);

    const year = (await screen.findByLabelText("Tahun Angkatan")) as HTMLInputElement;
    expect(year).toHaveValue(1955);
    expect(year.getAttribute("min")).toBeNull();
    expect(year.getAttribute("max")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /save profile/i }));

    await waitFor(() => expect(updateMyAlumni).toHaveBeenCalledOnce());
    // Untouched: the legacy value is not re-sent, so it cannot be rejected.
    expect(updateMyAlumni.mock.calls[0][0]).not.toHaveProperty("tahunAngkatan");
  });

  it("keeps the 1961..2059 bounds on a value inside that window", async () => {
    getMyAlumni.mockResolvedValue({ ...profile, tahunAngkatan: 2015 });
    updateMyAlumni.mockResolvedValue({ ...profile, tahunAngkatan: 2015 });
    render(<AlumniProfile />);

    const year = (await screen.findByLabelText("Tahun Angkatan")) as HTMLInputElement;
    expect(year.getAttribute("min")).toBe("1961");
    expect(year.getAttribute("max")).toBe("2059");
  });
});
