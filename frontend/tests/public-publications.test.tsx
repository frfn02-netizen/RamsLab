import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Publications from "@/components/public/publications";
import { getPublicPublicationList } from "@/lib/api/modules";
import type { Publication } from "@/types/modules";

const mocks = vi.hoisted(() => ({
  replace: vi.fn(),
  searchParams: new URLSearchParams(),
}));

vi.mock("@/i18n/navigation", () => ({
  usePathname: () => "/publications",
  useRouter: () => ({ replace: mocks.replace }),
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => mocks.searchParams,
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, values?: Record<string, number>) => {
    if (key === "resultCount") return `${values?.count ?? 0} Publications`;
    if (key === "pageStatus") return `Page ${values?.page ?? 1} of ${values?.totalPages ?? 1}`;
    const messages: Record<string, string> = {
      allYears: "All Years",
      apply: "Apply",
      closeFilters: "Close filters",
      emptyDescription: "Try adjusting your search or filters.",
      emptyEyebrow: "No matching records",
      emptyTitle: "No publications found",
      error: "Publication records are temporarily unavailable.",
      filterPublications: "Filter publications",
      heroDescription: "Publication archive",
      heroEyebrow: "Research archive",
      heroTitle: "Publications",
      loading: "Loading publications",
      method: "METHOD",
      newestFirst: "Newest first",
      nextPage: "Next",
      noOptions: "No options available",
      oldestFirst: "Oldest first",
      pagination: "Publication pages",
      previousPage: "Previous",
      publicationRecord: "Publication record",
      search: "Search",
      searchPlaceholder: "Search publications, authors, topics...",
      sort: "Sort",
      topic: "TOPIC",
      viewPublication: "VIEW PUBLICATION",
      year: "YEAR",
    };
    return messages[key] ?? key;
  },
}));

vi.mock("@/lib/api/modules", () => ({
  getPublicPublicationList: vi.fn(),
}));

function publication(id: string, title: string): Publication {
  return {
    _id: id,
    title,
    authors: ["Demo Author"],
    publicationType: "Article",
    year: 2026,
    journal: "Demo Journal",
    doi: null,
    pdfUrl: null,
    topics: ["Hydrodynamics"],
    methods: ["CFD"],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

const listResponse = (data: Publication[], total: number, page = 1) => ({
  data,
  total,
  page,
  limit: 100,
  facets: { years: [2026], topics: ["Hydrodynamics"], methods: ["CFD"] },
});

beforeEach(() => {
  vi.useRealTimers();
  mocks.replace.mockReset();
  mocks.searchParams = new URLSearchParams();
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  });
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
  vi.mocked(getPublicPublicationList).mockReset();
});

describe("public Publications page", () => {
  it("keeps search on the server-side publications query", async () => {
    vi.mocked(getPublicPublicationList).mockResolvedValue(listResponse([publication("publication-search", "Marine Search Result")], 1));

    render(<Publications />);
    await waitFor(() => expect(screen.getAllByText("Marine Search Result").length).toBeGreaterThan(0));

    fireEvent.change(screen.getByRole("searchbox", { name: "Search" }), { target: { value: "marine" } });

    await waitFor(() => expect(getPublicPublicationList).toHaveBeenLastCalledWith(expect.objectContaining({ search: "marine" })));
  });
});
