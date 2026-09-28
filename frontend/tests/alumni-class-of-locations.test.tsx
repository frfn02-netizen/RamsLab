import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import type { PublicPerson } from "@/types/people";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
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

vi.mock("next/image", () => ({
  default: ({ alt, ...props }: { alt: string; [key: string]: unknown }) => (
    <img alt={alt} {...props} />
  ),
}));

const { getPublicAlumniById } = vi.hoisted(() => ({
  getPublicAlumniById: vi.fn(),
}));
vi.mock("@/lib/api/modules", () => ({
  getPublicAlumniById,
  getPublicAlumniList: vi.fn(),
  getPublicPeopleList: vi.fn(),
}));

vi.mock("@/components/public/public-container", () => ({
  default: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock("@/components/public/public-states", () => ({
  PublicLoading: ({ label }: { label: string }) => (
    <div role="status">{label}</div>
  ),
  PublicError: ({ message }: { message: string }) => (
    <div role="alert">{message}</div>
  ),
  PublicEmpty: () => null,
}));

vi.mock("@/components/public/reveal-on-scroll", () => ({
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

import AlumniProfile from "@/components/public/alumni-profile";
import { MemberCard, RoleLine } from "@/components/public/team-directory";

function person(overrides: Partial<PublicPerson>): PublicPerson {
  return {
    id: "person-1",
    category: "ALUMNI",
    fullName: "Cohort Alumni",
    title: "",
    position: "Engineer",
    specialization: [],
    ...overrides,
  };
}

async function renderPublicProfile(overrides: Partial<PublicPerson>) {
  getPublicAlumniById.mockResolvedValue(person(overrides));
  render(<AlumniProfile id="person-1" />);
  await waitFor(() =>
    expect(screen.getByRole("heading", { name: "Cohort Alumni" })).toBeTruthy(),
  );
}

describe("Public alumni profile – cohort label", () => {
  it("renders year and batch number together", async () => {
    await renderPublicProfile({ angkatan: 55, tahunAngkatan: 2015 });

    expect(screen.getByText("classOf 2015 (P55)")).toBeInTheDocument();
  });

  it("renders the batch number alone for alumni saved without a year", async () => {
    await renderPublicProfile({ angkatan: 55 });

    expect(screen.getByText("classOf P55")).toBeInTheDocument();
    expect(screen.queryByText(/2015/)).not.toBeInTheDocument();
  });

  it("renders the year alone when the batch number is missing", async () => {
    await renderPublicProfile({ angkatan: undefined, tahunAngkatan: 2015 });

    expect(screen.getByText("classOf 2015")).toBeInTheDocument();
    expect(screen.queryByText(/P\d+/)).not.toBeInTheDocument();
  });

  it("renders no cohort label when both are missing", async () => {
    await renderPublicProfile({ angkatan: undefined });

    expect(screen.queryByText(/classOf/)).not.toBeInTheDocument();
    expect(screen.queryByText(/P\d+/)).not.toBeInTheDocument();
  });
});

describe("Team directory MemberCard – cohort label", () => {
  it("renders year and batch number together for an alumni member", () => {
    render(
      <MemberCard
        member={person({ angkatan: 55, tahunAngkatan: 2015 })}
        roleFallback="Alumni"
      />,
    );

    expect(screen.getByText("classOf 2015 (P55)")).toBeInTheDocument();
  });

  it("falls back to the batch number alone", () => {
    render(
      <MemberCard member={person({ angkatan: 55 })} roleFallback="Alumni" />,
    );

    expect(screen.getByText("classOf P55")).toBeInTheDocument();
  });

  it("renders no cohort label when both are missing", () => {
    render(
      <MemberCard
        member={person({ angkatan: undefined, tahunAngkatan: undefined })}
        roleFallback="Alumni"
      />,
    );

    expect(screen.queryByText(/classOf/)).not.toBeInTheDocument();
    expect(screen.queryByText(/P\d+/)).not.toBeInTheDocument();
  });
});

describe("Team directory RoleLine – no dangling batch number", () => {
  it("renders the role without a P suffix for a non alumni member", () => {
    render(
      <RoleLine
        member={person({
          category: "DOSEN",
          title: "Lecturer",
          position: undefined,
          angkatan: undefined,
        })}
        fallback="Lecturer"
      />,
    );

    expect(screen.getByText("Lecturer")).toBeInTheDocument();
    expect(screen.queryByText(/P\d+/)).not.toBeInTheDocument();
  });

  it("uses the shared formatter instead of a bare P suffix", () => {
    render(
      <RoleLine
        member={person({
          title: "Lecturer",
          position: undefined,
          angkatan: 55,
          tahunAngkatan: 2015,
        })}
        fallback="Lecturer"
      />,
    );

    expect(screen.getByText("Lecturer · classOf 2015 (P55)")).toBeInTheDocument();
    expect(screen.queryByText(/· P55$/)).not.toBeInTheDocument();
  });
});
