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
  "graduateGroups.MAHASISWA": "PhD",
  "graduateGroups.MASTER": "Master's",
  roleFallback: "Role not listed",
  searchLabel: "Search people",
  searchPlaceholder: "Search people...",
  loading: "Loading team profiles",
  error: "Team profiles are temporarily unavailable.",
  noResultsTitle: "No people match this search",
  noResultsDescription: "Try a different name or keyword.",
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
    expect(screen.queryAllByRole("article").length).toBeGreaterThan(0),
  );
  return utils;
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

  it("marks the active category with aria-pressed and a crimson pill", async () => {
    await renderDirectory();

    const active = screen.getByRole("button", { name: "Lecturers" });
    expect(active).toHaveAttribute("aria-pressed", "true");
    expect(active.className).toContain("bg-red-700");
    expect(active.className).toContain("rounded-full");

    const inactive = screen.getByRole("button", { name: "Alumni" });
    expect(inactive).toHaveAttribute("aria-pressed", "false");
    expect(inactive.className).not.toContain("bg-red-700");
  });

  it("renders a single unified control bar without area filters or sorting", async () => {
    await renderDirectory();

    expect(screen.getByRole("searchbox")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "All Research Areas" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Safety" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    expect(screen.queryByText("Filter by research area")).not.toBeInTheDocument();
    expect(screen.queryByText("Sort")).not.toBeInTheDocument();
  });

  it("does not render a redundant section heading above the grid", async () => {
    await renderDirectory();

    expect(
      screen.queryByRole("heading", { name: "Our Lecturers" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("LECTURERS")).not.toBeInTheDocument();
  });

  it("switches categories when a tab is selected", async () => {
    await renderDirectory();

    fireEvent.click(screen.getByRole("button", { name: "Graduate Students" }));
    expect(screen.getByRole("heading", { name: "PhD" })).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Master's" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Phd Candidate")).toBeInTheDocument();
    expect(screen.getByText("Master Candidate")).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "Undergraduate Students" }),
    );
    expect(screen.getByText("Undergraduate Student")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Vocational Interns" }));
    expect(screen.getByText("Vocational Intern")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Alumni" }));
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
    expect(screen.getByText("Graduate Students")).toBeInTheDocument();
  });

  it("searches research interests as well as names", async () => {
    await renderDirectory();

    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "compilers" },
    });

    expect(screen.getByText("Dr. Grace Hopper")).toBeInTheDocument();
    expect(screen.queryByText("Dr. Ada Lovelace")).not.toBeInTheDocument();
  });

  it("searches alumni program and location", async () => {
    await renderDirectory();
    fireEvent.click(screen.getByRole("button", { name: "Alumni" }));

    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "surabaya" },
    });

    expect(screen.getByText("Alumni Person")).toBeInTheDocument();

    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "zzz-no-match" },
    });

    expect(screen.getByText("No people match this search")).toBeInTheDocument();
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
      screen.getByText("Try a different name or keyword."),
    ).toBeInTheDocument();
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

  it("shows the first two expertise tags with an overflow count", async () => {
    await renderDirectory();
    const card = screen.getByText("Dr. Ada Lovelace").closest("article")!;
    const tags = Array.from(card.querySelectorAll("li")).map(
      (node) => node.textContent,
    );
    expect(tags).toEqual(["Reliability", "Safety", "+2"]);

    for (const tag of card.querySelectorAll("li")) {
      expect(tag.className).toContain("rounded");
      expect(tag.className).toContain("bg-stone-100");
      expect(tag.className).toContain("px-1.5");
      expect(tag.className).toContain("text-[10px]");
      expect(tag.className).toContain("text-stone-700");
    }
  });

  it("does not show an overflow count when two or fewer tags exist", async () => {
    await renderDirectory();
    const card = screen.getByText("Dr. Grace Hopper").closest("article")!;
    const tags = Array.from(card.querySelectorAll("li")).map(
      (node) => node.textContent,
    );
    expect(tags).toEqual(["Compilers"]);
  });

  it("renders a vertical portrait card with the photo above the copy", async () => {
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

    expect(card.className).toContain("flex");
    expect(card.className).toContain("flex-col");
    expect(card.className).toContain("rounded-xl");
    expect(card.className).toContain("border-stone-200");
    expect(card.className).toContain("hover:shadow-sm");
    expect(card.className).toContain("group");

    expect(link.className).toContain("flex");
    expect(link.className).toContain("flex-1");
    expect(link.className).toContain("flex-col");
    expect(portrait.className).toContain("aspect-[4/3]");
    expect(portrait.className).toContain("bg-stone-100");
    expect(portrait.className).toContain("overflow-hidden");
    expect(img.className).toContain("h-full");
    expect(img.className).toContain("w-full");
    expect(img.className).toContain("object-cover");
    expect(img.className).toContain("group-hover:scale-[1.02]");

    const heading = screen.getByRole("heading", { name: "Photo Person" });
    const body = heading.closest("div")!;
    expect(body.className).toContain("flex-1");
    expect(body.className).toContain("flex-col");
    expect(body.className).toContain("p-3.5");

    expect(
      portrait.compareDocumentPosition(heading) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("renders a stone monogram fallback when the profile has no photo", async () => {
    await renderDirectory();

    const fallback = screen.getByLabelText("Dr. Ada Lovelace avatar");
    expect(fallback.className).toContain("bg-stone-100");
    expect(fallback.className).toContain("text-stone-500");

    const initials = screen.getByText("DA");
    expect(initials.className).toContain("text-base");
    expect(initials.className).toContain("font-semibold");
  });

  it("renders the role line below the name in muted text", async () => {
    await renderDirectory();
    const role = screen.getByText("Lecturer · Head of Laboratory");
    expect(role.className).toContain("text-xs");
    expect(role.className).toContain("text-stone-500");
    expect(role.className).toContain("line-clamp-1");

    const heading = screen.getByRole("heading", {
      name: "Dr. Ada Lovelace",
    });
    expect(
      heading.compareDocumentPosition(role) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("keeps the whole card clickable without a separate view affordance", async () => {
    await renderDirectory();
    const card = screen.getByText("Dr. Ada Lovelace").closest("article")!;
    const nameNode = screen.getByText("Dr. Ada Lovelace");

    expect(card.textContent).not.toContain("View profile");

    const links = card.querySelectorAll("a");
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute("href", "/team/dosen-1");
    expect(links[0]).toHaveAttribute("aria-label", "Dr. Ada Lovelace");
    expect(links[0].contains(nameNode)).toBe(true);
  });

  it("clamps long names to two lines instead of truncating them", async () => {
    const people = basePeople();
    const longName =
      "Prof. Dr. Ir. Alexander Maximilian Fitzgerald-Wibowo, M.Sc.";
    people.DOSEN = [person({ id: "long", fullName: longName })];
    getPublicPeopleList.mockResolvedValue(people);

    await renderDirectory();

    const heading = screen.getByRole("heading", { name: longName });
    expect(heading).toBeInTheDocument();
    expect(heading.className).not.toContain("truncate");
    expect(heading.className).toContain("line-clamp-2");
    expect(heading.className).toContain("leading-snug");
  });

  it("renders alumni cohort, position, company, program and location", async () => {
    await renderDirectory();
    fireEvent.click(screen.getByRole("button", { name: "Alumni" }));

    expect(screen.getByText(/classOf 2015 \(P55\)/)).toBeInTheDocument();
    expect(screen.getByText("Engineer")).toBeInTheDocument();
    expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    expect(screen.getByText(/Marine Engineering/)).toBeInTheDocument();
    expect(screen.getByText(/Surabaya/)).toBeInTheDocument();
  });

  it("uses a five column portrait grid on desktop", async () => {
    const { container } = await renderDirectory();
    const grid = container.querySelector(".grid");
    expect(grid).not.toBeNull();
    expect(grid!.className).toContain("grid-cols-1");
    expect(grid!.className).toContain("sm:grid-cols-2");
    expect(grid!.className).toContain("md:grid-cols-3");
    expect(grid!.className).toContain("lg:grid-cols-5");
    expect(grid!.className).toContain("gap-4");
    expect(grid!.className).toContain("lg:gap-5");
    expect(grid!.className).toContain("pt-8");
  });

  it("pins the credential line to the bottom in muted stone", async () => {
    const people = basePeople();
    people.DOSEN = [
      person({
        id: "meta",
        fullName: "Metadata Person",
        title: "Lecturer",
        department: "Marine Engineering",
      }),
    ];
    getPublicPeopleList.mockResolvedValue(people);

    await renderDirectory();

    const credential = screen.getByText("Marine Engineering");
    expect(credential.className).toContain("mt-auto");
    expect(credential.className).toContain("pt-2.5");
    expect(credential.className).toContain("text-[11px]");
    expect(credential.className).toContain("text-stone-400");
    expect(credential.className).toContain("line-clamp-1");
  });
});

describe("People directory – server data", () => {
  it("renders the server-provided directory without an initial loading state", () => {
    render(<TeamDirectory initialPeople={basePeople()} />);

    expect(screen.getByText("Dr. Ada Lovelace")).toBeInTheDocument();
    expect(
      screen.queryByRole("status", { name: "Loading team profiles" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
