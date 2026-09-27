import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import EditDosen from "@/components/dashboard/edit-dosen";
import type { Dosen, Publication } from "@/types/modules";

const { getDosenById, getPublications, updateDosen, uploadDosenPhoto } =
  vi.hoisted(() => ({
    getDosenById: vi.fn(),
    getPublications: vi.fn(),
    updateDosen: vi.fn(),
    uploadDosenPhoto: vi.fn(),
  }));

vi.mock("@/lib/api/modules", () => ({
  getDosenById,
  getPublications,
  updateDosen,
  uploadDosenPhoto,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => "/dashboard/dosen/d1/edit",
}));

const FULL_NAME = "Prof. Dr. Ketut Buda Artana, S.T., M.Sc.";

function dosen(overrides: Partial<Dosen> = {}): Dosen {
  return {
    _id: "d1",
    userId: "u1",
    fullName: FULL_NAME,
    email: "artana@example.com",
    specialization: [],
    showNip: false,
    showNidn: false,
    showEmail: false,
    isPublic: true,
    publicationIds: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function publication(overrides: Partial<Publication>): Publication {
  return {
    _id: "pub",
    title: "Untitled",
    authors: [],
    publicationType: "Article",
    year: 2025,
    journal: "RAMS Journal",
    doi: null,
    pdfUrl: null,
    topics: [],
    methods: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function label(p: Publication) {
  const source = [p.publicationType, p.journal].filter(Boolean).join(" · ");
  return `${p.title} (${p.year}${source ? ", " + source : ""})`;
}

const shortName = publication({
  _id: "pub-short",
  title: "Short name paper",
  authors: ["Ketut Buda"],
});

const initials = publication({
  _id: "pub-initials",
  title: "Initials paper",
  authors: ["John Smith", "K.B. Artana"],
});

const sameFirstToken = publication({
  _id: "pub-same-first-token",
  title: "Other lecturer paper",
  authors: ["Ketut Santoso"],
});

const surnameOnly = publication({
  _id: "pub-surname-only",
  title: "Surname only paper",
  authors: ["Artana"],
});

const unrelated = publication({
  _id: "pub-unrelated",
  title: "Unrelated paper",
  authors: ["John Smith"],
});

const selected = publication({
  _id: "pub-selected",
  title: "Already selected paper",
  authors: ["Ketut Buda"],
});

function mockApi(records: Publication[], selectedIds: string[] = []) {
  getDosenById.mockResolvedValue(dosen({ publicationIds: selectedIds }));
  getPublications.mockResolvedValue({
    data: records,
    total: records.length,
    page: 1,
    limit: 200,
    facets: { years: [], topics: [], methods: [], publicationTypes: [] },
  });
}

async function openDropdown() {
  const button = await screen.findByRole("button", {
    name: "+ Add publication",
  });
  fireEvent.click(button);
  await waitFor(() => {
    expect(document.querySelector("ul.absolute")).not.toBeNull();
  });
  return document.querySelector("ul.absolute") as HTMLElement;
}

describe("admin edit dosen publication matching", () => {
  it("only offers publications whose authors match the lecturer", async () => {
    mockApi([shortName, initials, sameFirstToken, surnameOnly, unrelated]);

    render(<EditDosen id="d1" />);
    const dropdown = await openDropdown();

    expect(within(dropdown).getByText(label(shortName))).toBeInTheDocument();
    expect(within(dropdown).getByText(label(initials))).toBeInTheDocument();

    expect(within(dropdown).queryByText(label(sameFirstToken))).toBeNull();
    expect(within(dropdown).queryByText(label(surnameOnly))).toBeNull();
    expect(within(dropdown).queryByText(label(unrelated))).toBeNull();
  });

  it("keeps already selected publications listed and out of the dropdown", async () => {
    mockApi([shortName, initials, selected], ["pub-selected"]);

    render(<EditDosen id="d1" />);

    await waitFor(() => {
      expect(screen.getByText(label(selected))).toBeInTheDocument();
    });
    expect(screen.getByText("Remove")).toBeInTheDocument();

    const dropdown = await openDropdown();
    expect(within(dropdown).getByText(label(shortName))).toBeInTheDocument();
    expect(within(dropdown).queryByText(label(selected))).toBeNull();
  });

  it("adds a matching publication to the selection", async () => {
    mockApi([shortName, initials, unrelated]);

    render(<EditDosen id="d1" />);
    const dropdown = await openDropdown();

    fireEvent.click(within(dropdown).getByText(label(shortName)));

    await waitFor(() => {
      expect(document.querySelector("ul.absolute")).toBeNull();
    });
    expect(screen.getByText(label(shortName))).toBeInTheDocument();
    expect(screen.getAllByText("Remove")).toHaveLength(1);
    expect(getDosenById).toHaveBeenCalledWith("d1");
    expect(updateDosen).not.toHaveBeenCalled();
    expect(uploadDosenPhoto).not.toHaveBeenCalled();
  });
});
