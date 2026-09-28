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
  useAuth: () => ({
    user: { role: "ADMIN" },
    status: "authenticated",
  }),
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

function profile(overrides: Partial<Alumni>): Alumni {
  return {
    _id: "alumni-1",
    userId: "user-1",
    fullName: "Cohort Alumni",
    nim: "NIM-034",
    angkatan: 34,
    tahunAngkatan: undefined,
    program: "Naval Architecture",
    currentStatus: "WORKING",
    careerHistory: [],
    educationHistory: [],
    isPublic: true,
    reviewStatus: "APPROVED",
    profileCompleted: true,
    accountEmail: "alumni@test.local",
    accountActive: true,
    createdAt: "2024-01-01",
    updatedAt: "2024-01-01",
    ...overrides,
  } as unknown as Alumni;
}

function yearInput() {
  return screen.getByPlaceholderText("e.g. 2015") as HTMLInputElement;
}

async function openEditForm() {
  fireEvent.click(await screen.findByRole("button", { name: /edit profile/i }));
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Alumni admin – header cohort label", () => {
  it("shows the year together with the batch number", async () => {
    getAlumniById.mockResolvedValue(
      profile({ angkatan: 55, tahunAngkatan: 2015 }),
    );

    render(<AlumniDetail id="alumni-1" />);

    await waitFor(() =>
      expect(
        screen.getByText("Naval Architecture · Class of 2015 (P55)"),
      ).toBeInTheDocument(),
    );
  });

  it("falls back to the batch number alone for alumni saved without a year", async () => {
    getAlumniById.mockResolvedValue(profile({ angkatan: 34 }));

    render(<AlumniDetail id="alumni-1" />);

    await waitFor(() =>
      expect(
        screen.getByText("Naval Architecture · Class of P34"),
      ).toBeInTheDocument(),
    );
    expect(screen.queryByText(/· P34$/)).toBeNull();
  });

  it("never leaves a dangling separator when the batch number is missing", async () => {
    getAlumniById.mockResolvedValue(
      profile({ angkatan: undefined, tahunAngkatan: undefined }),
    );

    render(<AlumniDetail id="alumni-1" />);

    await waitFor(() =>
      expect(screen.getByText("Naval Architecture")).toBeInTheDocument(),
    );
    expect(screen.queryByText(/Naval Architecture ·/)).not.toBeInTheDocument();
    expect(screen.queryByText(/P\d+/)).not.toBeInTheDocument();
  });
});

describe("Alumni admin – tahunAngkatan edit form", () => {
  it("loads the stored year and sends an edited year back", async () => {
    getAlumniById.mockResolvedValue(
      profile({ angkatan: 34, tahunAngkatan: 2015 }),
    );
    updateAlumni.mockResolvedValue(
      profile({ angkatan: 34, tahunAngkatan: 2016 }),
    );

    render(<AlumniDetail id="alumni-1" />);
    await openEditForm();

    await waitFor(() => expect(yearInput().value).toBe("2015"));

    fireEvent.change(yearInput(), { target: { value: "2016" } });
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => expect(updateAlumni).toHaveBeenCalled());
    const payload = updateAlumni.mock.calls[0][1] as Record<string, unknown>;
    expect(payload.tahunAngkatan).toBe(2016);
  });

  it("sends null when the admin clears the year", async () => {
    getAlumniById.mockResolvedValue(
      profile({ angkatan: 34, tahunAngkatan: 2015 }),
    );
    updateAlumni.mockResolvedValue(
      profile({ angkatan: 34, tahunAngkatan: null }),
    );

    render(<AlumniDetail id="alumni-1" />);
    await openEditForm();

    await waitFor(() => expect(yearInput().value).toBe("2015"));

    fireEvent.change(yearInput(), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => expect(updateAlumni).toHaveBeenCalled());
    const payload = updateAlumni.mock.calls[0][1] as Record<string, unknown>;
    expect(payload.tahunAngkatan).toBeNull();
  });

  it("still lets an admin correct the batch number after it has been saved", async () => {
    getAlumniById.mockResolvedValue(profile({ angkatan: 34 }));
    updateAlumni.mockResolvedValue(profile({ angkatan: 55 }));

    render(<AlumniDetail id="alumni-1" />);
    await openEditForm();

    await waitFor(() => expect(screen.getByDisplayValue("34")).toBeTruthy());

    fireEvent.change(screen.getByDisplayValue("34"), {
      target: { value: "55" },
    });
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => expect(updateAlumni).toHaveBeenCalled());
    const payload = updateAlumni.mock.calls[0][1] as Record<string, unknown>;
    expect(payload.angkatan).toBe(55);
  });

  it("keeps the stored batch number while only the year is edited", async () => {
    getAlumniById.mockResolvedValue(
      profile({ angkatan: 34, tahunAngkatan: undefined }),
    );
    updateAlumni.mockResolvedValue(
      profile({ angkatan: 34, tahunAngkatan: 2015 }),
    );

    render(<AlumniDetail id="alumni-1" />);
    await openEditForm();

    await waitFor(() => expect(yearInput().value).toBe(""));

    fireEvent.change(yearInput(), { target: { value: "2015" } });

    // The stored P must survive the year edit.
    expect(screen.getByDisplayValue("34")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => expect(updateAlumni).toHaveBeenCalled());
    const payload = updateAlumni.mock.calls[0][1] as Record<string, unknown>;
    expect(payload.tahunAngkatan).toBe(2015);
    expect(payload.angkatan).toBe(34);
  });
});
