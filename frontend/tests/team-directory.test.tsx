import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import type { PublicPeopleResponse, PublicPerson } from "@/types/people";

const { getPublicPeopleList } = vi.hoisted(() => ({
  getPublicPeopleList: vi.fn(),
}));

vi.mock("@/lib/api/modules", () => ({ getPublicPeopleList }));

const messages: Record<string, string> = {
  categoriesLabel: "People categories",
  "categories.DOSEN": "Lecturers",
  "categories.STUDENTS": "Graduate Students",
  "categories.UNDERGRADUATE": "Undergraduate Students",
  "categories.INTERNSHIP": "Vocational Interns",
  "categories.ALUMNI": "Alumni",
  "sections.DOSEN.eyebrow": "LECTURERS",
  "sections.DOSEN.title": "Our Lecturers",
  "sections.DOSEN.description":
    "Academic leaders and researchers who drive RAMS's research, education, and innovation.",
  "sections.STUDENTS.eyebrow": "GRADUATE STUDENTS",
  "sections.STUDENTS.title": "Our Graduate Students",
  "sections.STUDENTS.description":
    "Researchers advancing the laboratory through focused master's and doctoral work.",
  "sections.UNDERGRADUATE.eyebrow": "UNDERGRADUATE STUDENTS",
  "sections.UNDERGRADUATE.title": "Our Undergraduate Students",
  "sections.UNDERGRADUATE.description":
    "Students building research experience through applied maritime and reliability projects.",
  "sections.INTERNSHIP.eyebrow": "VOCATIONAL INTERNS",
  "sections.INTERNSHIP.title": "Our Vocational Interns",
  "sections.INTERNSHIP.description":
    "Vocational interns contributing technical work across laboratory projects.",
  "sections.ALUMNI.eyebrow": "ALUMNI",
  "sections.ALUMNI.title": "Our Alumni",
  "sections.ALUMNI.description":
    "Former members carrying RAMS research into industry, academia, and public service.",
  "roleBadges.DOSEN": "Lecturer",
  "roleBadges.MAHASISWA": "Doctoral researcher",
  "roleBadges.MASTER": "Master's researcher",
  "roleBadges.UNDERGRADUATE": "Undergraduate researcher",
  "roleBadges.INTERNSHIP": "Vocational intern",
  "roleBadges.ALUMNI": "Alumni",
  "graduateGroups.MAHASISWA": "PhD",
  "graduateGroups.MASTER": "Master's",
  profileLink: "View profile",
  roleFallback: "Role not listed",
  searchLabel: "Search people",
  searchPlaceholder: "Search people, research interest, or keyword...",
  filterLabel: "Filter by research area",
  filterAll: "All Research Areas",
  filterReliability: "Reliability",
  filterSafety: "Safety",
  filterMaintenance: "Maintenance",
  filterMaritime: "Maritime Systems",
  filterAis: "AIS",
  filterSimulation: "Simulation",
  sortLabel: "Sort",
  sortDefault: "Default order",
  sortName: "Name (A-Z)",
  loading: "Loading team profiles",
  error: "Team profiles are temporarily unavailable.",
  noResultsTitle: "No people match this search",
  noResultsDescription:
    "Adjust the search terms or choose a different research area.",
  noProfilesTitle: "No profiles published",
  noProfilesDescription:
    "Profiles in this category will appear here when available.",
  studentGroupEmpty: "No profiles published in this category.",
  classOf: "classOf",
  requestUnavailable: "Request unavailable",
  tryAgain: "Try again",
};

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => messages[key] ?? key,
  useLocale: () => "en",
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({
    children,
    href,
    ...props
  }: {
    children: ReactNode;
    href?: string;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("next/image", () => ({
  default: ({ alt, ...props }: { alt: string; [key: string]: unknown }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={alt} {...props} />
  ),
}));

vi.mock("@/components/public/reveal-on-scroll", () => ({
  default: ({
    children,
    className,
  }: {
    children: ReactNode;
    className?: string;
  }) => <div className={className}>{children}</div>,
}));

import TeamDirectory from "@/components/public/team-directory";

function person(overrides: Partial<PublicPerson>): PublicPerson {
  return {
    id: "person-1",
    category: "DOSEN",
    fullName: "Test Person",
    specialization: [],
    ...overrides,
  };
}

function basePeople(): PublicPeopleResponse {
  return {
    DOSEN: [
      person({
        id: "dosen-1",
        category: "DOSEN",
        fullName: "Dr. Ada Lovelace",
        title: "Lecturer",
        position: "Head of Laboratory",
        specialization: ["Reliability", "Safety", "AIS", "Extra"],
      }),
      person({
        id: "dosen-2",
        category: "DOSEN",
        fullName: "Dr. Grace Hopper",
        title: "Senior Lecturer",
        specialization: ["Compilers"],
      }),
    ],
    MAHASISWA: [
      person({
        id: "phd-1",
        category: "MAHASISWA",
        fullName: "Phd Candidate",
        title: "Doctor of Engineering",
        specialization: ["Simulation"],
      }),
    ],
    MASTER: [
      person({
        id: "master-1",
        category: "MASTER",
        fullName: "Master Candidate",
        title: "Master of Science",
      }),
    ],
    UNDERGRADUATE: [
      person({
        id: "ug-1",
        category: "UNDERGRADUATE",
        fullName: "Undergraduate Student",
        title: "Bachelor of Engineering",
        specialization: ["Marine Systems"],
      }),
    ],
    INTERNSHIP: [
      person({
        id: "intern-1",
        category: "INTERNSHIP",
        fullName: "Vocational Intern",
        title: "Software Engineering",
        specialization: ["Backend"],
      }),
    ],
    ALUMNI: [
      person({
        id: "alum-1",
        category: "ALUMNI",
        fullName: "Alumni Person",
        position: "Engineer",
        program: "Marine Engineering",
        location: "Surabaya",
        specialization: ["Acme Corp"],
        angkatan: 55,
        tahunAngkatan: 2015,
      }),
    ],
  };
}

async function renderDirectory() {
  const people = await getPublicPeopleList();
  const utils = render(<TeamDirectory initialPeople={people} />);
  await waitFor(() =>
    expect(
      screen.queryByRole("heading", { name: "Our Lecturers" }),
    ).toBeTruthy(),
  );
  return utils;
}

function cardNames() {
  return screen
    .getAllByRole("article")
    .map((article) => article.querySelector("h3")?.textContent ?? "");
}

beforeEach(() => {
  getPublicPeopleList.mockReset();
  getPublicPeopleList.mockResolvedValue(basePeople());
});

describe("People directory – categories and switching", () => {
  it("renders all five category tabs", async () => {
    await renderDirectory();

    for (const label of [
      "Lecturers",
      "Graduate Students",
      "Undergraduate Students",
      "Vocational Interns",
      "Alumni",
    ]) {
      expect(screen.getByRole("button", { name: label })).toBeInTheDocument();
    }
  });

  it("marks the active category with aria-pressed", async () => {
    await renderDirectory();

    expect(screen.getByRole("button", { name: "Lecturers" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "Alumni" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("shows the section header for the active category", async () => {
    await renderDirectory();

    expect(
      screen.getByRole("heading", { name: "Our Lecturers" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Academic leaders and researchers who drive RAMS's research, education, and innovation.",
      ),
    ).toBeInTheDocument();
  });

  it("switches sections and content when a category tab is selected", async () => {
    await renderDirectory();

    fireEvent.click(screen.getByRole("button", { name: "Graduate Students" }));
    expect(
      screen.getByRole("heading", { name: "Our Graduate Students" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "PhD" })).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Master's" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Phd Candidate")).toBeInTheDocument();
    expect(screen.getByText("Master Candidate")).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "Undergraduate Students" }),
    );
    expect(
      screen.getByRole("heading", { name: "Our Undergraduate Students" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Undergraduate Student")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Vocational Interns" }));
    expect(
      screen.getByRole("heading", { name: "Our Vocational Interns" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Vocational Intern")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Alumni" }));
    expect(
      screen.getByRole("heading", { name: "Our Alumni" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Alumni Person")).toBeInTheDocument();
  });
});

describe("People directory – profile links", () => {
  it("links members to the team detail route", async () => {
    await renderDirectory();
    expect(
      screen.getByRole("link", { name: "Dr. Ada Lovelace" }),
    ).toHaveAttribute("href", "/team/dosen-1");
  });

  it("links alumni to the alumni detail route", async () => {
    await renderDirectory();
    fireEvent.click(screen.getByRole("button", { name: "Alumni" }));
    expect(screen.getByRole("link", { name: "Alumni Person" })).toHaveAttribute(
      "href",
      "/alumni/alum-1",
    );
  });
});

describe("People directory – search", () => {
  it("filters the active category without changing categories", async () => {
    await renderDirectory();

    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "grace" },
    });

    expect(screen.getByText("Dr. Grace Hopper")).toBeInTheDocument();
    expect(screen.queryByText("Dr. Ada Lovelace")).not.toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Our Lecturers" }),
    ).toBeInTheDocument();
  });

  it("searches research interests as well as names", async () => {
    await renderDirectory();

    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "compilers" },
    });

    expect(screen.getByText("Dr. Grace Hopper")).toBeInTheDocument();
    expect(screen.queryByText("Dr. Ada Lovelace")).not.toBeInTheDocument();
  });

  it("resets the search when switching categories", async () => {
    await renderDirectory();
    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "grace" },
    });
    expect(screen.queryByText("Dr. Ada Lovelace")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Alumni" }));
    fireEvent.click(screen.getByRole("button", { name: "Lecturers" }));

    expect(screen.getByText("Dr. Ada Lovelace")).toBeInTheDocument();
  });

  it("shows an empty state when nothing matches", async () => {
    await renderDirectory();

    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "zzz-no-match" },
    });

    expect(screen.getByText("No people match this search")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Adjust the search terms or choose a different research area.",
      ),
    ).toBeInTheDocument();
  });
});

describe("People directory – research area filters", () => {
  it("filters by research area tokens", async () => {
    await renderDirectory();

    fireEvent.click(screen.getByRole("button", { name: "Safety" }));

    expect(screen.getByText("Dr. Ada Lovelace")).toBeInTheDocument();
    expect(screen.queryByText("Dr. Grace Hopper")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "All Research Areas" }));

    expect(screen.getByText("Dr. Grace Hopper")).toBeInTheDocument();
  });

  it("matches maritime vocabulary used by profile tags", async () => {
    await renderDirectory();
    fireEvent.click(
      screen.getByRole("button", { name: "Undergraduate Students" }),
    );

    fireEvent.click(screen.getByRole("button", { name: "Maritime Systems" }));

    expect(screen.getByText("Undergraduate Student")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Simulation" }));

    expect(screen.getByText("No people match this search")).toBeInTheDocument();
  });

  it("resets the research area when switching categories", async () => {
    await renderDirectory();
    fireEvent.click(screen.getByRole("button", { name: "Safety" }));
    expect(screen.queryByText("Dr. Grace Hopper")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Alumni" }));
    fireEvent.click(screen.getByRole("button", { name: "Lecturers" }));

    expect(screen.getByText("Dr. Grace Hopper")).toBeInTheDocument();
  });
});

describe("People directory – sorting", () => {
  it("sorts by name while keeping the active filters", async () => {
    getPublicPeopleList.mockResolvedValue({
      ...basePeople(),
      DOSEN: [
        person({ id: "zara", fullName: "Zara Rahman" }),
        person({ id: "amir", fullName: "Amir Kusuma" }),
      ],
    });

    await renderDirectory();
    expect(cardNames()).toEqual(["Zara Rahman", "Amir Kusuma"]);

    fireEvent.change(screen.getByLabelText("Sort"), {
      target: { value: "name" },
    });

    expect(cardNames()).toEqual(["Amir Kusuma", "Zara Rahman"]);
  });
});

describe("People directory – cards", () => {
  it("renders only the fields that exist for a minimal profile", async () => {
    const people = basePeople();
    people.DOSEN = [person({ id: "bare", fullName: "Bare Profile" })];
    getPublicPeopleList.mockResolvedValue(people);

    await renderDirectory();

    expect(screen.getByText("Bare Profile")).toBeInTheDocument();
    const article = screen.getByRole("article");
    expect(article.querySelectorAll("li")).toHaveLength(0);
  });

  it("caps visible expertise tags at three", async () => {
    await renderDirectory();
    const card = screen.getByText("Dr. Ada Lovelace").closest("article")!;
    const tags = Array.from(card.querySelectorAll("li")).map(
      (node) => node.textContent,
    );
    expect(tags).toEqual(["Reliability", "Safety", "AIS"]);
  });

  it("renders a horizontal card with the portrait on the left", async () => {
    const people = basePeople();
    people.DOSEN = [
      person({
        id: "photo-1",
        fullName: "Photo Person",
        photo: "https://example.test/photo.jpg",
        title: "Lecturer",
        specialization: ["Reliability"],
      }),
    ];
    getPublicPeopleList.mockResolvedValue(people);

    await renderDirectory();

    const card = screen.getByText("Photo Person").closest("article")!;
    const link = card.querySelector("a")!;
    const img = card.querySelector("img")!;
    const portrait = img.parentElement!;
    const portraitColumn = portrait.parentElement!;

    expect(link.className).toContain("flex");
    expect(portraitColumn.className).toContain("w-[104px]");
    expect(portraitColumn.className).toContain("sm:w-[124px]");
    expect(portraitColumn.className).toContain("lg:w-[132px]");
    expect(portrait.className).toContain("h-full");
    expect(portrait.className).toContain("overflow-hidden");
    expect(img.className).toContain("object-cover");
    expect(card.className).toContain("border-[var(--team-border)]");

    const heading = screen.getByRole("heading", { name: "Photo Person" });
    expect(
      portrait.compareDocumentPosition(heading) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("uses natural card height without fixed or min-height styling", async () => {
    await renderDirectory();
    const card = screen.getByText("Dr. Ada Lovelace").closest("article")!;
    expect(card.className).not.toMatch(/\bh-\[|\bmin-h-\[/);
    expect(card.className).toContain("h-full");
  });

  it("renders the role/position in uppercase blue below the name", async () => {
    await renderDirectory();
    const role = screen.getByText("Lecturer · Head of Laboratory");
    expect(role.className).toContain("uppercase");
    expect(role.className).toContain("text-[var(--team-blue)]");

    const heading = screen.getByRole("heading", {
      name: "Dr. Ada Lovelace",
    });
    expect(
      heading.compareDocumentPosition(role) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("keeps the whole card clickable with one link and a view affordance", async () => {
    await renderDirectory();
    const card = screen.getByText("Dr. Ada Lovelace").closest("article")!;
    const nameNode = screen.getByText("Dr. Ada Lovelace");

    expect(card.querySelectorAll(".absolute")).toHaveLength(0);
    expect(card.textContent).toContain("View profile");

    const links = card.querySelectorAll("a");
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute("href", "/team/dosen-1");
    expect(links[0]).toHaveAttribute("aria-label", "Dr. Ada Lovelace");
    expect(
      screen.queryByRole("link", { name: /view profile/i }),
    ).not.toBeInTheDocument();
    expect(links[0].contains(nameNode)).toBe(true);
  });

  it("keeps long names fully readable without truncation classes", async () => {
    const people = basePeople();
    const longName =
      "Prof. Dr. Ir. Alexander Maximilian Fitzgerald-Wibowo, M.Sc.";
    people.DOSEN = [person({ id: "long", fullName: longName })];
    getPublicPeopleList.mockResolvedValue(people);

    await renderDirectory();

    const heading = screen.getByRole("heading", { name: longName });
    expect(heading).toBeInTheDocument();
    expect(heading.className).not.toContain("truncate");
    expect(heading.className).not.toContain("line-clamp");
  });

  it("renders alumni cohort, position, company, program and location", async () => {
    await renderDirectory();
    fireEvent.click(screen.getByRole("button", { name: "Alumni" }));

    expect(screen.getByText("classOf 2015 (P55)")).toBeInTheDocument();
    expect(screen.getByText("Engineer")).toBeInTheDocument();
    expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    expect(screen.getByText("Marine Engineering")).toBeInTheDocument();
    expect(screen.getByText("Surabaya")).toBeInTheDocument();
  });

  it("uses a three column profile grid on desktop", async () => {
    const { container } = await renderDirectory();
    const grid = container.querySelector(".grid");
    expect(grid).not.toBeNull();
    expect(grid!.className).toContain("grid-cols-1");
    expect(grid!.className).toContain("sm:grid-cols-2");
    expect(grid!.className).toContain("lg:grid-cols-3");
    expect(grid!.className).toContain("auto-rows-fr");
    expect(grid!.className).not.toContain("lg:grid-cols-5");
  });
});

describe("People directory – server data", () => {
  it("renders the server-provided directory without an initial loading state", () => {
    render(<TeamDirectory initialPeople={basePeople()} />);

    expect(
      screen.getByRole("heading", { name: "Our Lecturers" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("status", { name: "Loading team profiles" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
