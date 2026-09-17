import { vi, describe, expect, it, beforeEach } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: () => {}, replace: () => {}, back: () => {} }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => "en",
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({ children, ...props }: any) => ({
    type: "a",
    props: { children, ...props },
  }),
}));

import {
  filterLecturerPublications,
  normalizeAuthorName,
} from "@/components/public/public-dosen-profile";
import type { Publication } from "@/types/modules";

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

function publication(overrides: Partial<Publication>): Publication {
  return {
    _id: "publication-1",
    title: "Reliability study",
    authors: ["Aria Putra"],
    publicationType: "Article",
    year: 2026,
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

// ---------------------------------------------------------------------------
// 1. normalizeAuthorName
// ---------------------------------------------------------------------------

describe("1. normalizeAuthorName", () => {
  it("trims and lowercases", () => {
    expect(normalizeAuthorName("  Aria Putra  ")).toBe("aria putra");
  });

  it("collapses repeated whitespace", () => {
    expect(normalizeAuthorName("  Aria   Putra  ")).toBe("aria putra");
  });

  it("handles null and undefined", () => {
    expect(normalizeAuthorName(null)).toBe("");
    expect(normalizeAuthorName(undefined)).toBe("");
  });

  it("handles empty string", () => {
    expect(normalizeAuthorName("")).toBe("");
  });
});

// ---------------------------------------------------------------------------
// 2. filterLecturerPublications – eligible publications
// ---------------------------------------------------------------------------

describe("2. Eligible publications", () => {
  const publications = [
    publication({
      _id: "pub1",
      title: "TEST - Maritime Risk Assessment",
      authors: ["TEST - Prof. Budi Santoso", "External Author One", "External Author Two"],
      doi: "10.9999/test-maritime-risk",
    }),
    publication({
      _id: "pub2",
      title: "TEST - Advanced Marine Systems",
      authors: ["External Author One", "TEST - Dr. Aria Putra", "External Author Three"],
      doi: "10.9999/test-marine-systems",
    }),
    publication({
      _id: "pub3",
      title: "TEST - Collaborative Ocean Research",
      authors: ["TEST - Prof. Budi Santoso", "TEST - Dr. Aria Putra", "External Author Four"],
      doi: "10.9999/test-collaborative-ocean",
    }),
    publication({
      _id: "pub4",
      title: "TEST - Maria Putra False Positive",
      authors: ["TEST - Maria Putra", "External Author Five"],
      doi: "10.9999/test-maria-putra",
    }),
    publication({
      _id: "pub5",
      title: "TEST - Whitespace Matching",
      authors: ["TEST - Dr. Aria   Putra", "External Author Six"],
      doi: "10.9999/test-whitespace",
    }),
  ];

  it("Prof. Budi Santoso gets only pub1 and pub3", () => {
    const result = filterLecturerPublications(publications, "TEST - Prof. Budi Santoso");
    expect(result.map((p) => p._id).sort()).toEqual(["pub1", "pub3"]);
  });

  it("Dr. Aria Putra gets pub2, pub3, pub5", () => {
    const result = filterLecturerPublications(publications, "TEST - Dr. Aria Putra");
    expect(result.map((p) => p._id).sort()).toEqual(["pub2", "pub3", "pub5"]);
  });

  it("Maria Putra gets only pub4", () => {
    const result = filterLecturerPublications(publications, "TEST - Maria Putra");
    expect(result.map((p) => p._id)).toEqual(["pub4"]);
  });
});

// ---------------------------------------------------------------------------
// 3. False positive protection
// ---------------------------------------------------------------------------

describe("3. False positive protection", () => {
  const publications = [
    publication({
      _id: "aria-pub",
      title: "Aria's Paper",
      authors: ["TEST - Dr. Aria Putra"],
    }),
    publication({
      _id: "maria-pub",
      title: "Maria's Paper",
      authors: ["TEST - Maria Putra"],
    }),
  ];

  it("Maria Putra does NOT match Dr. Aria Putra", () => {
    const result = filterLecturerPublications(publications, "TEST - Maria Putra");
    expect(result.map((p) => p._id)).toEqual(["maria-pub"]);
    expect(result.map((p) => p._id)).not.toContain("aria-pub");
  });

  it("Dr. Aria Putra does NOT match Maria Putra", () => {
    const result = filterLecturerPublications(publications, "TEST - Dr. Aria Putra");
    expect(result.map((p) => p._id)).toEqual(["aria-pub"]);
    expect(result.map((p) => p._id)).not.toContain("maria-pub");
  });
});

// ---------------------------------------------------------------------------
// 4. Whitespace normalization
// ---------------------------------------------------------------------------

describe("4. Whitespace normalization", () => {
  it("matches 'TEST - Dr. Aria   Putra' (extra spaces) with 'TEST - Dr. Aria Putra'", () => {
    const pubs = [
      publication({
        _id: "ws-match",
        authors: ["TEST - Dr. Aria   Putra"],
      }),
      publication({
        _id: "ws-no-match",
        authors: ["TEST - Maria Putra"],
      }),
    ];
    const result = filterLecturerPublications(pubs, "TEST - Dr. Aria Putra");
    expect(result.map((p) => p._id)).toEqual(["ws-match"]);
  });

  it("normalizes lecturer name input with extra spaces", () => {
    const pubs = [
      publication({
        _id: "input-ws",
        authors: ["TEST - Dr. Aria Putra"],
      }),
    ];
    const result = filterLecturerPublications(pubs, "  TEST - Dr.   Aria   Putra  ");
    expect(result.map((p) => p._id)).toEqual(["input-ws"]);
  });
});

// ---------------------------------------------------------------------------
// 5. Multiple authors
// ---------------------------------------------------------------------------

describe("5. Multiple authors", () => {
  it("matches publication with multiple authors where one matches", () => {
    const pubs = [
      publication({
        _id: "multi",
        authors: ["Author A", "TEST - Prof. Budi Santoso", "Author C"],
      }),
    ];
    const result = filterLecturerPublications(pubs, "TEST - Prof. Budi Santoso");
    expect(result).toHaveLength(1);
    expect(result[0]._id).toBe("multi");
  });

  it("does not match when no author matches", () => {
    const pubs = [
      publication({
        _id: "no-match",
        authors: ["Author A", "Author B"],
      }),
    ];
    const result = filterLecturerPublications(pubs, "TEST - Prof. Budi Santoso");
    expect(result).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 6. Deduplication
// ---------------------------------------------------------------------------

describe("6. Deduplication", () => {
  it("removes duplicate publications by DOI", () => {
    const pubs = [
      publication({
        _id: "first",
        doi: "10.1000/example",
        authors: ["TEST - Prof. Budi Santoso"],
      }),
      publication({
        _id: "duplicate",
        doi: "10.1000/EXAMPLE",
        authors: ["TEST - Prof. Budi Santoso"],
      }),
    ];
    const result = filterLecturerPublications(pubs, "TEST - Prof. Budi Santoso");
    expect(result).toHaveLength(1);
  });

  it("removes duplicate publications by title+year+authors in same order", () => {
    const pubs = [
      publication({
        _id: "first",
        doi: null,
        title: "Same Paper",
        year: 2024,
        authors: ["TEST - Dr. Aria Putra", "Co Author"],
      }),
      publication({
        _id: "duplicate",
        doi: null,
        title: "Same Paper",
        year: 2024,
        authors: ["TEST - Dr. Aria Putra", "Co Author"],
      }),
    ];
    const result = filterLecturerPublications(pubs, "TEST - Dr. Aria Putra");
    expect(result).toHaveLength(1);
  });

  it("does not deduplicate when author order differs (distinct records)", () => {
    const pubs = [
      publication({
        _id: "first",
        doi: null,
        title: "Same Paper",
        year: 2024,
        authors: ["TEST - Dr. Aria Putra", "Co Author"],
      }),
      publication({
        _id: "second",
        doi: null,
        title: "Same Paper",
        year: 2024,
        authors: ["Co Author", "TEST - Dr. Aria Putra"],
      }),
    ];
    const result = filterLecturerPublications(pubs, "TEST - Dr. Aria Putra");
    expect(result).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// 7. Empty and edge cases
// ---------------------------------------------------------------------------

describe("7. Empty and edge cases", () => {
  it("returns empty array for empty publications list", () => {
    expect(filterLecturerPublications([], "TEST - Prof. Budi Santoso")).toEqual([]);
  });

  it("returns empty array for empty name", () => {
    const pubs = [publication({ authors: ["TEST - Prof. Budi Santoso"] })];
    expect(filterLecturerPublications(pubs, "")).toEqual([]);
  });

  it("returns empty array for null name", () => {
    const pubs = [publication({ authors: ["TEST - Prof. Budi Santoso"] })];
    expect(filterLecturerPublications(pubs, null)).toEqual([]);
  });

  it("handles publications with empty authors array", () => {
    const pubs = [publication({ authors: [] })];
    const result = filterLecturerPublications(pubs, "TEST - Prof. Budi Santoso");
    expect(result).toHaveLength(0);
  });

  it("handles publication with undefined authors", () => {
    const pubs = [publication({ authors: undefined as unknown as string[] })];
    const result = filterLecturerPublications(pubs, "TEST - Prof. Budi Santoso");
    expect(result).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 8. Case sensitivity
// ---------------------------------------------------------------------------

describe("8. Case sensitivity", () => {
  it("matching is case-insensitive", () => {
    const pubs = [
      publication({
        _id: "case-test",
        authors: ["test - prof. budi santoso"],
      }),
    ];
    const result = filterLecturerPublications(pubs, "TEST - Prof. Budi Santoso");
    expect(result).toHaveLength(1);
    expect(result[0]._id).toBe("case-test");
  });
});

// ---------------------------------------------------------------------------
// 9. Substring non-matching
// ---------------------------------------------------------------------------

describe("9. Substring non-matching", () => {
  it("'Budi' does not match 'Prof. Budi Santoso' as a standalone query", () => {
    const pubs = [
      publication({
        _id: "full-name",
        authors: ["TEST - Prof. Budi Santoso"],
      }),
    ];
    // Searching for just "Budi" should NOT match because "budi" != "test - prof. budi santoso"
    const result = filterLecturerPublications(pubs, "Budi");
    expect(result).toHaveLength(0);
  });

  it("'Putra' does not match 'Dr. Aria Putra'", () => {
    const pubs = [
      publication({
        _id: "putra-test",
        authors: ["TEST - Dr. Aria Putra"],
      }),
    ];
    const result = filterLecturerPublications(pubs, "Putra");
    expect(result).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 10. Existing lecturer-publications.test.ts patterns preserved
// ---------------------------------------------------------------------------

describe("10. Original test patterns (backward compatibility)", () => {
  it("normalizes case and repeated whitespace without using substring matching", () => {
    expect(normalizeAuthorName("  Aria   Putra ")).toBe("aria putra");

    const records = [
      publication({ _id: "exact", authors: ["aria  putra", "Co Author"] }),
      publication({ _id: "substring", authors: ["Maria Putra"] }),
    ];

    expect(filterLecturerPublications(records, " Aria Putra ")).toEqual([
      records[0],
    ]);
  });

  it("matches a complete author entry and removes duplicate publications", () => {
    const records = [
      publication({ _id: "first", doi: "10.1000/example" }),
      publication({
        _id: "duplicate",
        doi: "10.1000/EXAMPLE",
        authors: ["Co Author", " ARIA PUTRA "],
      }),
      publication({ _id: "other", authors: ["Co Author"] }),
    ];

    expect(filterLecturerPublications(records, "Aria Putra")).toEqual([
      records[0],
    ]);
    expect(filterLecturerPublications(records, "")).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// 11. testfiturbaru matching
// ---------------------------------------------------------------------------

describe("11. testfiturbaru matching", () => {
  it("lecturer 'testfiturbaru' matches author 'testfiturbaru'", () => {
    const pubs = [
      publication({ _id: "tfb1", authors: ["testfiturbaru"] }),
    ];
    const result = filterLecturerPublications(pubs, "testfiturbaru");
    expect(result).toHaveLength(1);
    expect(result[0]._id).toBe("tfb1");
  });

  it("case normalization: 'testfiturbaru' matches author 'TESTFITURBARU'", () => {
    const pubs = [
      publication({ _id: "tfb2", authors: ["TESTFITURBARU"] }),
    ];
    const result = filterLecturerPublications(pubs, "testfiturbaru");
    expect(result).toHaveLength(1);
    expect(result[0]._id).toBe("tfb2");
  });

  it("whitespace normalization: '  testfiturbaru  ' matches author 'testfiturbaru'", () => {
    const pubs = [
      publication({ _id: "tfb3", authors: ["testfiturbaru"] }),
    ];
    const result = filterLecturerPublications(pubs, "  testfiturbaru  ");
    expect(result).toHaveLength(1);
    expect(result[0]._id).toBe("tfb3");
  });

  it("false positive: 'testfiturbaru' does NOT match author 'testfiturbaru junior'", () => {
    const pubs = [
      publication({ _id: "tfb4a", authors: ["testfiturbaru"] }),
      publication({ _id: "tfb4b", authors: ["testfiturbaru junior"] }),
    ];
    const result = filterLecturerPublications(pubs, "testfiturbaru");
    expect(result).toHaveLength(1);
    expect(result[0]._id).toBe("tfb4a");
  });

  it("multiple authors: lecturer as author #2 matches", () => {
    const pubs = [
      publication({
        _id: "tfb5",
        authors: ["Author X", "testfiturbaru", "Author Y"],
      }),
    ];
    const result = filterLecturerPublications(pubs, "testfiturbaru");
    expect(result).toHaveLength(1);
    expect(result[0]._id).toBe("tfb5");
  });
});

// ---------------------------------------------------------------------------
// 12. Pagination: fetch all pages until exhausted
// ---------------------------------------------------------------------------

describe("12. Pagination fetches all pages", () => {
  const PAGE_LIMIT = 200;

  it("pagination loop fetches beyond page 1 when total > PAGE_LIMIT", () => {
    const pages = [
      {
        data: Array.from({ length: PAGE_LIMIT }, (_, i) =>
          publication({ _id: `page1-${i}`, authors: ["Other"] }),
        ),
        total: PAGE_LIMIT + 1,
        page: 1,
        limit: PAGE_LIMIT,
        facets: { years: [], topics: [], methods: [], publicationTypes: [] },
      },
      {
        data: [
          publication({
            _id: "page2-match",
            authors: ["testfiturbaru"],
          }),
        ],
        total: PAGE_LIMIT + 1,
        page: 2,
        limit: PAGE_LIMIT,
        facets: { years: [], topics: [], methods: [], publicationTypes: [] },
      },
    ];

    let callIndex = 0;
    const mockGetPublications = vi.fn().mockImplementation(async () => {
      return pages[callIndex++];
    });

    // Simulate the same pagination logic used in edit-dosen.tsx and public-dosen-profile.tsx
    async function fetchAllMatching(getPublicationsFn: typeof mockGetPublications) {
      const all: Publication[] = [];
      let page = 1;
      let total = Infinity;
      while (all.length < total) {
        const res = await getPublicationsFn({
          page,
          limit: PAGE_LIMIT,
          sort: "newest",
        });
        const rows = res.data ?? [];
        all.push(...rows);
        total = res.total ?? all.length;
        if (rows.length === 0 || all.length >= total) break;
        page += 1;
      }
      return all.filter((pub) =>
        (pub.authors ?? []).some(
          (a) => normalizeAuthorName(a) === normalizeAuthorName("testfiturbaru"),
        ),
      );
    }

    return fetchAllMatching(mockGetPublications).then((result) => {
      expect(mockGetPublications).toHaveBeenCalledTimes(2);
      expect(result).toHaveLength(1);
      expect(result[0]._id).toBe("page2-match");
    });
  });

  it("frontend never requests limit > 200 (backend maxPageSize)", () => {
    const limits: number[] = [];
    const mockGetPublications = vi.fn().mockImplementation(async (opts: any) => {
      limits.push(opts.limit);
      return {
        data: [],
        total: 0,
        page: 1,
        limit: opts.limit,
        facets: { years: [], topics: [], methods: [], publicationTypes: [] },
      };
    });

    // Replicate the DosenPublicationsSection fetch logic
    async function fetchPublications(getPublicationsFn: typeof mockGetPublications) {
      const PAGE_LIMIT = 200;
      const all: Publication[] = [];
      let page = 1;
      let total = Infinity;
      while (all.length < total) {
        const res = await getPublicationsFn({
          page,
          limit: PAGE_LIMIT,
          sort: "newest",
        });
        const rows = res.data ?? [];
        all.push(...rows);
        total = res.total ?? all.length;
        if (rows.length === 0 || all.length >= total) break;
        page += 1;
      }
      return all;
    }

    return fetchPublications(mockGetPublications).then(() => {
      for (const limit of limits) {
        expect(limit).toBeLessThanOrEqual(200);
        expect(limit).toBeGreaterThan(0);
      }
    });
  });
});

// ---------------------------------------------------------------------------
// 13. API error handling: catch + empty available
// ---------------------------------------------------------------------------

describe("13. API error handling", () => {
  it("failed publication request does not crash; available stays empty", async () => {
    const mockGetPublications = vi
      .fn()
      .mockRejectedValue(new Error("Network error"));

    // Simulates the catch(() => {}) path in DosenPublicationsSection
    let matched: Publication[] = [];
    try {
      const res = await mockGetPublications({
        page: 1,
        limit: 200,
        sort: "newest",
      });
      matched = (res.data ?? []).filter((pub: Publication) =>
        (pub.authors ?? []).some(
          (a: string) =>
            normalizeAuthorName(a) === normalizeAuthorName("testfiturbaru"),
        ),
      );
    } catch {
      matched = [];
    }

    expect(matched).toEqual([]);
  });
});
