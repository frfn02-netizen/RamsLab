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
  "graduateGroups.MAHASISWA": "PHD",
  "graduateGroups.MASTER": "MASTER",
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
    expect(
      screen.getByRole("heading", { name: "PHD" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "MASTER" }),
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
  it("uses the same unboxed centered structure across every category", async () => {
    await renderDirectory();

    for (const label of [
      "Lecturers",
      "Graduate Students",
      "Undergraduate Students",
      "Vocational Interns",
      "Alumni",
    ]) {
      fireEvent.click(screen.getByRole("button", { name: label }));

      const card = screen.getAllByRole("article")[0]!;
      expect(card.className).toContain("group");
      expect(card.className).toContain("flex-col");
      expect(card.className).toContain("items-center");
      expect(card.className).toContain("text-center");
      expect(card.className).not.toContain("rounded-lg");
      expect(card.className).not.toContain("rounded-xl");
      expect(card.className).not.toContain("border");
      expect(card.className).not.toContain("bg-white");
      expect(card.className).not.toContain("shadow");

      const heading = card.querySelector("h3")!;
      expect(heading.className).toContain("text-sm");
      expect(heading.className).toContain("font-bold");

      if (
        label === "Undergraduate Students" ||
        label === "Graduate Students"
      ) {
        expect(card.querySelector("p")).toBeNull();
      } else {
        const role = card.querySelector("p")!;
        expect(role.className).toContain("uppercase");
        expect(role.className).toContain("text-red-700");
      }

      expect(card.querySelector("ul")).toBeNull();
      expect(card.querySelector("li")).toBeNull();
    }
  });

  it("shows only the 1:1 photo and name for undergraduate students", async () => {
    await renderDirectory();
    fireEvent.click(
      screen.getByRole("button", { name: "Undergraduate Students" }),
    );

    const link = screen.getByRole("link", { name: "Undergraduate Student" });
    expect(link).toHaveAttribute("href", "/team/ug-1");

    const card = link.closest("article")!;
    expect(
      screen.getByRole("heading", { name: "Undergraduate Student" }),
    ).toBeInTheDocument();
    expect(card.querySelectorAll("p")).toHaveLength(0);
    expect(screen.queryByText("Bachelor of Engineering")).toBeNull();
    expect(screen.queryByText("Marine Systems")).toBeNull();

    const portrait = link.querySelector("div")!;
    expect(portrait.className).toContain("aspect-square");
    expect(portrait.className).toContain("w-full");
    expect(portrait.className).toContain("overflow-hidden");
    expect(portrait.className).toContain("rounded-md");
    expect(portrait.className).toContain("bg-stone-100");
    expect(
      screen.getByLabelText("Undergraduate Student avatar"),
    ).toBeInTheDocument();

    const grid = card.parentElement!;
    expect(grid.className).toContain("lg:grid-cols-5");
  });

  it("shows only the 1:1 photo and name for graduate students", async () => {
    await renderDirectory();
    fireEvent.click(screen.getByRole("button", { name: "Graduate Students" }));

    const phdLink = screen.getByRole("link", { name: "Phd Candidate" });
    expect(phdLink).toHaveAttribute("href", "/team/phd-1");
    const phdCard = phdLink.closest("article")!;
    expect(phdCard.querySelectorAll("p")).toHaveLength(0);
    expect(screen.queryByText("Doctor of Engineering")).toBeNull();
    expect(screen.queryByText("Simulation")).toBeNull();

    const phdPortrait = phdLink.querySelector("div")!;
    expect(phdPortrait.className).toContain("aspect-square");
    expect(phdPortrait.className).toContain("w-full");
    expect(phdPortrait.className).toContain("overflow-hidden");
    expect(phdPortrait.className).toContain("rounded-md");
    expect(phdPortrait.className).toContain("bg-stone-100");
    expect(screen.getByLabelText("Phd Candidate avatar")).toBeInTheDocument();

    const masterLink = screen.getByRole("link", { name: "Master Candidate" });
    expect(masterLink).toHaveAttribute("href", "/team/master-1");
    expect(masterLink.closest("article")!.querySelectorAll("p")).toHaveLength(0);

    expect(
      screen.getByRole("heading", { name: "PHD" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "MASTER" }),
    ).toBeInTheDocument();

    const grid = phdCard.parentElement!;
    expect(grid.className).toContain("lg:grid-cols-5");
  });

  it("renders editorial graduate group headings with a count", async () => {
    await renderDirectory();
    fireEvent.click(screen.getByRole("button", { name: "Graduate Students" }));

    const heading = screen.getByRole("heading", {
      name: "PHD",
    });
    expect(heading.className).toContain("text-2xl");
    expect(heading.className).toContain("sm:text-3xl");
    expect(heading.className).toContain("font-bold");
    expect(heading.className).toContain("uppercase");
    expect(heading.className).toContain("tracking-tight");
    expect(heading.className).toContain("text-stone-900");

    const header = heading.parentElement!;
    expect(header.className).toContain("flex");
    expect(header.className).toContain("items-baseline");
    expect(header.className).toContain("justify-between");
    expect(header.className).toContain("border-b");
    expect(header.className).toContain("border-stone-200");
    expect(header.className).toContain("pb-3");
    expect(header.className).toContain("mb-6");

    const count = header.querySelector("span")!;
    expect(count.textContent).toBe("1");
    expect(count.className).toContain("text-xs");
    expect(count.className).toContain("font-medium");
    expect(count.className).toContain("tabular-nums");
    expect(count.className).toContain("text-stone-400");

    expect(
      screen.getByRole("heading", { name: "MASTER" }),
    ).toBeInTheDocument();
  });

  it("renders 1:1 fallback frames and clickable names for students", async () => {
    await renderDirectory();
    fireEvent.click(screen.getByRole("button", { name: "Graduate Students" }));

    const phdLink = screen.getByRole("link", { name: "Phd Candidate" });
    expect(phdLink).toHaveAttribute("href", "/team/phd-1");

    const phdPortrait = phdLink.querySelector("div")!;
    expect(phdPortrait.className).toContain("aspect-square");
    expect(phdPortrait.className).toContain("w-full");
    expect(phdPortrait.className).toContain("overflow-hidden");
    expect(phdPortrait.className).toContain("rounded-md");
    expect(phdPortrait.className).toContain("bg-stone-100");
    expect(phdPortrait.querySelector("img")).toBeNull();

    const phdAvatar = screen.getByLabelText("Phd Candidate avatar");
    expect(phdAvatar.className).toContain("bg-stone-100");
    expect(phdAvatar.className).toContain("text-stone-500");
    expect(screen.getByText("PC").className).toContain("font-semibold");
    expect(
      screen.getByRole("link", { name: "Master Candidate" }),
    ).toHaveAttribute("href", "/team/master-1");

    fireEvent.click(
      screen.getByRole("button", { name: "Undergraduate Students" }),
    );

    const undergradLink = screen.getByRole("link", {
      name: "Undergraduate Student",
    });
    expect(undergradLink).toHaveAttribute("href", "/team/ug-1");

    const undergradPortrait = undergradLink.querySelector("div")!;
    expect(undergradPortrait.className).toContain("aspect-square");
    expect(undergradPortrait.className).toContain("w-full");
    expect(undergradPortrait.className).toContain("overflow-hidden");
    expect(undergradPortrait.className).toContain("rounded-md");
    expect(undergradPortrait.className).toContain("bg-stone-100");
    expect(undergradPortrait.querySelector("img")).toBeNull();
    expect(screen.getByLabelText("Undergraduate Student avatar")).toBeVisible();
  });

  it("renders top-aligned 1:1 photos for students with a photo URL", async () => {
    const people = basePeople();
    people.MAHASISWA = [
      person({
        id: "phd-photo",
        category: "MAHASISWA",
        fullName: "Photo Grad",
        photo: "https://example.test/grad.jpg",
      }),
    ];
    people.UNDERGRADUATE = [
      person({
        id: "ug-photo",
        category: "UNDERGRADUATE",
        fullName: "Photo Undergrad",
        photo: "https://example.test/ug.jpg",
      }),
    ];
    getPublicPeopleList.mockResolvedValue(people);

    await renderDirectory();
    fireEvent.click(screen.getByRole("button", { name: "Graduate Students" }));

    const gradImg = screen
      .getByRole("link", { name: "Photo Grad" })
      .querySelector("img")!;
    const gradPortrait = gradImg.parentElement!;
    expect(gradPortrait.className).toContain("aspect-square");
    expect(gradPortrait.className).toContain("w-full");
    expect(gradImg.className).toContain("h-full");
    expect(gradImg.className).toContain("w-full");
    expect(gradImg.className).toContain("object-cover");
    expect(gradImg.className).toContain("object-top");

    fireEvent.click(
      screen.getByRole("button", { name: "Undergraduate Students" }),
    );

    const undergradImg = screen
      .getByRole("link", { name: "Photo Undergrad" })
      .querySelector("img")!;
    const undergradPortrait = undergradImg.parentElement!;
    expect(undergradPortrait.className).toContain("aspect-square");
    expect(undergradPortrait.className).toContain("w-full");
    expect(undergradImg.className).toContain("object-cover");
    expect(undergradImg.className).toContain("object-top");
  });

  it("shows the search empty state for student lists", async () => {
    await renderDirectory();
    fireEvent.click(screen.getByRole("button", { name: "Graduate Students" }));

    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "zzz-no-match" },
    });

    expect(screen.getByText("No people match this search")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Phd Candidate" })).toBeNull();
  });

  it("renders only the fields that exist for a minimal profile", async () => {
    const people = basePeople();
    people.DOSEN = [person({ id: "bare", fullName: "Bare Profile" })];
    getPublicPeopleList.mockResolvedValue(people);

    await renderDirectory();

    expect(screen.getByText("Bare Profile")).toBeInTheDocument();
    const article = screen.getByRole("article");
    expect(article.querySelectorAll("li")).toHaveLength(0);
  });

  it("renders focus topics as dot-separated text without pills", async () => {
    await renderDirectory();
    const card = screen.getByText("Dr. Ada Lovelace").closest("article")!;
    const topics = screen.getByText("Reliability · Safety · AIS · Extra");

    expect(topics.className).toContain("mt-1.5");
    expect(topics.className).toContain("text-[11px]");
    expect(topics.className).toContain("leading-relaxed");
    expect(topics.className).toContain("text-stone-500");
    expect(card.querySelectorAll("li")).toHaveLength(0);
  });

  it("renders a single focus topic without a separator", async () => {
    await renderDirectory();

    expect(screen.getByText("Compilers")).toBeInTheDocument();
  });

  it("renders an unboxed square portrait above the copy", async () => {
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
    expect(card.className).toContain("items-center");
    expect(card.className).toContain("text-center");
    expect(card.className).not.toContain("rounded-lg");
    expect(card.className).not.toContain("border");
    expect(card.className).not.toContain("bg-white");
    expect(card.className).not.toContain("p-4");
    expect(card.className).not.toContain("shadow");
    expect(card.className).toContain("group");

    expect(link.className).toContain("flex");
    expect(link.className).toContain("flex-1");
    expect(link.className).toContain("flex-col");
    expect(link.className).toContain("items-center");
    expect(portrait.className).toContain("aspect-square");
    expect(portrait.className).not.toContain("aspect-[4/5]");
    expect(portrait.className).toContain("w-full");
    expect(portrait.className).toContain("rounded-md");
    expect(portrait.className).toContain("bg-stone-100");
    expect(img.className).toContain("h-full");
    expect(img.className).toContain("w-full");
    expect(img.className).toContain("object-cover");
    expect(img.className).toContain("object-top");
    expect(img.className).toContain("group-hover:opacity-90");
    expect(img.className).not.toContain("group-hover:scale-[1.02]");

    const heading = screen.getByRole("heading", { name: "Photo Person" });
    expect(heading.className).toContain("mt-3");
    expect(heading.className).toContain("text-sm");
    expect(heading.className).toContain("font-bold");
    expect(heading.className).toContain("leading-snug");
    expect(heading.className).toContain("group-hover:text-red-700");

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
    expect(initials.className).toContain("text-xl");
    expect(initials.className).toContain("font-semibold");
  });

  it("renders the role line below the name in crimson uppercase", async () => {
    await renderDirectory();
    const role = screen.getByText("Lecturer · Head of Laboratory");
    expect(role.className).toContain("text-[10px]");
    expect(role.className).toContain("font-semibold");
    expect(role.className).toContain("uppercase");
    expect(role.className).toContain("tracking-wider");
    expect(role.className).toContain("text-red-700");
    expect(role.className).toContain("leading-snug");

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
    expect(heading.className).toContain("text-sm");
    expect(heading.className).toContain("font-bold");
    expect(heading.className).toContain("leading-snug");
  });

  it("maps alumni role, cohort, company, program and location", async () => {
    await renderDirectory();
    fireEvent.click(screen.getByRole("button", { name: "Alumni" }));

    const role = screen.getByText("Engineer");
    expect(role.className).toContain("text-red-700");
    expect(role.className).toContain("uppercase");

    expect(
      screen.getByText(
        "classOf 2015 (P55) · Acme Corp · Marine Engineering · Surabaya",
      ),
    ).toBeInTheDocument();
  });

  it("uses a five column grid on desktop", async () => {
    const { container } = await renderDirectory();
    const grid = container.querySelector(".grid");
    expect(grid).not.toBeNull();
    expect(grid!.className).toContain("grid-cols-1");
    expect(grid!.className).toContain("sm:grid-cols-2");
    expect(grid!.className).toContain("md:grid-cols-3");
    expect(grid!.className).toContain("lg:grid-cols-5");
    expect(grid!.className).toContain("gap-x-6");
    expect(grid!.className).toContain("gap-y-8");
    expect(grid!.className).not.toContain("lg:gap-5");
    expect(grid!.className).toContain("pt-8");
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
