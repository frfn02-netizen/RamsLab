import { describe, expect, it } from "vitest";
import {
  isPublicationAuthorMatch,
  matchesAnyAuthor,
  normalizeAuthorName,
} from "@/lib/publication-author-match";

const FULL_NAME = "Prof. Dr. Ketut Buda Artana, S.T., M.Sc.";

describe("normalizeAuthorName", () => {
  it("trims, lowercases and collapses whitespace", () => {
    expect(normalizeAuthorName("  Aria   Putra  ")).toBe("aria putra");
    expect(normalizeAuthorName(null)).toBe("");
    expect(normalizeAuthorName(undefined)).toBe("");
    expect(normalizeAuthorName("")).toBe("");
  });
});

describe("gelar dan nama dipendekkan", () => {
  it("mencocokkan gelar depan/belakang dengan format pendek", () => {
    expect(isPublicationAuthorMatch(FULL_NAME, "Ketut Buda")).toBe(true);
  });

  it("mencocokkan initials dengan marga", () => {
    expect(isPublicationAuthorMatch(FULL_NAME, "K.B. Artana")).toBe(true);
    expect(isPublicationAuthorMatch(FULL_NAME, "K. B. Artana")).toBe(true);
    expect(isPublicationAuthorMatch(FULL_NAME, "Ketut B. Artana")).toBe(true);
  });

  it("mencocokkan format pendek yang berakhiran marga", () => {
    expect(isPublicationAuthorMatch(FULL_NAME, "Buda Artana")).toBe(true);
  });

  it("mencocokkan format panjang di sisi author", () => {
    expect(
      isPublicationAuthorMatch("Ketut Buda", "Ketut Buda Artana, S.T."),
    ).toBe(true);
  });

  it("mencocokkan nama dosen yang juga memuat gelar", () => {
    expect(
      isPublicationAuthorMatch(FULL_NAME, "Prof. Ketut Buda Artana"),
    ).toBe(true);
  });
});

describe("nama identik", () => {
  it("mencocokkan nama yang sama persis", () => {
    expect(isPublicationAuthorMatch(FULL_NAME, FULL_NAME)).toBe(true);
    expect(isPublicationAuthorMatch("Aria Putra", "Aria Putra")).toBe(true);
  });

  it("mencocokkan satu token identik", () => {
    expect(isPublicationAuthorMatch("testfiturbaru", "TESTFITURBARU")).toBe(
      true,
    );
  });

  it("mengabaikan perbedaan huruf besar/kecil", () => {
    expect(isPublicationAuthorMatch(FULL_NAME, FULL_NAME.toLowerCase())).toBe(
      true,
    );
    expect(isPublicationAuthorMatch("Aria Putra", "ARIA PUTRA")).toBe(true);
  });

  it("mengabaikan perbedaan whitespace", () => {
    expect(
      isPublicationAuthorMatch("Aria   Putra", "  aria putra "),
    ).toBe(true);
  });

  it("mengabaikan perbedaan punctuation dan singkatan gelar", () => {
    expect(
      isPublicationAuthorMatch("Aria Putra", "Aria Putra, S.T., M.Sc."),
    ).toBe(true);
    expect(
      isPublicationAuthorMatch("Aria Putra Wijaya", "Aria-Putra Wijaya"),
    ).toBe(true);
  });
});

describe("anti false positive", () => {
  it("tidak cocok hanya karena satu token umum", () => {
    expect(isPublicationAuthorMatch(FULL_NAME, "Ketut Santoso")).toBe(false);
    expect(isPublicationAuthorMatch(FULL_NAME, "Wayan Artana")).toBe(false);
    expect(isPublicationAuthorMatch(FULL_NAME, "Budi Buda")).toBe(false);
  });

  it("tidak cocok dengan author yang sama sekali berbeda", () => {
    expect(isPublicationAuthorMatch(FULL_NAME, "John Smith")).toBe(false);
    expect(isPublicationAuthorMatch("Aria Putra", "Maria Putra")).toBe(false);
  });

  it("tidak cocok hanya dari marga saja", () => {
    expect(isPublicationAuthorMatch(FULL_NAME, "Artana")).toBe(false);
  });

  it("tidak cocok dari gelar saja", () => {
    expect(isPublicationAuthorMatch(FULL_NAME, "Prof. Dr.")).toBe(false);
  });

  it("tidak cocok ketika nama dosen hanya satu token", () => {
    expect(isPublicationAuthorMatch("Budi", "Prof. Budi Santoso")).toBe(false);
    expect(isPublicationAuthorMatch("testfiturbaru", "testfiturbaru junior")).toBe(
      false,
    );
  });

  it("tidak cocok ketika salah satu nama kosong", () => {
    expect(isPublicationAuthorMatch("", "Aria Putra")).toBe(false);
    expect(isPublicationAuthorMatch("Aria Putra", "")).toBe(false);
    expect(isPublicationAuthorMatch(null, "Aria Putra")).toBe(false);
    expect(isPublicationAuthorMatch("Aria Putra", null)).toBe(false);
    expect(isPublicationAuthorMatch(undefined, undefined)).toBe(false);
  });
});

describe("matchesAnyAuthor", () => {
  const authors = ["John Smith", "K.B. Artana", "Ketut Santoso"];

  it("cocok ketika satu author cocok", () => {
    expect(matchesAnyAuthor(FULL_NAME, authors)).toBe(true);
  });

  it("tidak cocok ketika tidak ada author yang cocok", () => {
    expect(matchesAnyAuthor("Dewi Lestari", authors)).toBe(false);
  });

  it("aman untuk authors kosong atau tidak terdefinisi", () => {
    expect(matchesAnyAuthor(FULL_NAME, [])).toBe(false);
    expect(matchesAnyAuthor(FULL_NAME, null)).toBe(false);
    expect(matchesAnyAuthor(FULL_NAME, undefined)).toBe(false);
  });
});
