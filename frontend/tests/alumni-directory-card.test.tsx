import { render, screen } from "@testing-library/react";
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

vi.mock("@/lib/api/modules", () => ({
  getPublicAlumniList: vi.fn(),
}));

vi.mock("@/components/public/team-directory", () => ({
  ProfilePhoto: ({ name }: { name: string }) => (
    <div data-testid="profile-photo">{name}</div>
  ),
}));

vi.mock("@/components/public/reveal-on-scroll", () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

import { AlumniCard } from "@/components/public/alumni-directory";

function alumni(overrides: Partial<PublicPerson>): PublicPerson {
  return {
    id: "alumni-1",
    category: "ALUMNI",
    fullName: "Test Alumni",
    specialization: [],
    ...overrides,
  };
}

describe("AlumniCard – name link to detail page", () => {
  it("renders name as a link to the alumni detail page", () => {
    const member = alumni({
      fullName: "Jane Smith",
      id: "abc123",
    });
    render(<AlumniCard member={member} />);

    const link = screen.getByRole("link", { name: "Jane Smith" });
    expect(link).toHaveAttribute("href", "/alumni/abc123");
  });

  it("renders a separate LinkedIn link when linkedin is provided", () => {
    const member = alumni({
      fullName: "Jane Smith",
      id: "abc123",
      linkedin: "https://www.linkedin.com/in/janesmith",
    });
    render(<AlumniCard member={member} />);

    const nameLink = screen.getByRole("link", { name: "Jane Smith" });
    expect(nameLink).toHaveAttribute("href", "/alumni/abc123");

    const linkedinLink = screen.getByRole("link", { name: /profileLink/i });
    expect(linkedinLink).toHaveAttribute(
      "href",
      "https://www.linkedin.com/in/janesmith",
    );
    expect(linkedinLink).toHaveAttribute("target", "_blank");
    expect(linkedinLink).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("does not render LinkedIn link when linkedin is empty", () => {
    const member = alumni({
      fullName: "John Doe",
      linkedin: undefined,
    });
    render(<AlumniCard member={member} />);

    expect(
      screen.queryByRole("link", { name: /profileLink/i }),
    ).not.toBeInTheDocument();
  });

  it("does not render LinkedIn link when linkedin is empty string", () => {
    const member = alumni({
      fullName: "John Doe",
      linkedin: "",
    });
    render(<AlumniCard member={member} />);

    expect(
      screen.queryByRole("link", { name: /profileLink/i }),
    ).not.toBeInTheDocument();
  });
});

describe("AlumniCard – Class Of line", () => {
  it("renders CLASS OF with graduation year", () => {
    const member = alumni({
      fullName: "Jane Smith",
      angkatan: 20,
    });
    render(<AlumniCard member={member} />);

    expect(screen.getByText("P20")).toBeInTheDocument();
  });

  it("does not render P prefix when angkatan is missing", () => {
    const member = alumni({
      fullName: "Jane Smith",
      angkatan: undefined,
    });
    render(<AlumniCard member={member} />);

    expect(screen.queryByText(/P\d+/)).not.toBeInTheDocument();
  });

  it("does not render program line", () => {
    const member = alumni({
      fullName: "Jane Smith",
      program: "Master of Science",
      angkatan: 20,
    });
    render(<AlumniCard member={member} />);

    expect(screen.queryByText(/Master of Science/)).not.toBeInTheDocument();
  });
});

describe("AlumniCard – optional fields", () => {
  it("renders position when provided", () => {
    const member = alumni({
      fullName: "Position Test",
      position: "Software Engineer",
    });
    render(<AlumniCard member={member} />);

    expect(screen.getByText("Software Engineer")).toBeInTheDocument();
  });

  it("does not render position section when position is missing", () => {
    const member = alumni({
      fullName: "No Position",
      position: undefined,
    });
    render(<AlumniCard member={member} />);

    expect(screen.queryByText("Software Engineer")).not.toBeInTheDocument();
  });

  it("renders company when provided via specialization", () => {
    const member = alumni({
      fullName: "Company Test",
      specialization: ["Acme Corp"],
    });
    render(<AlumniCard member={member} />);

    expect(screen.getByText("Acme Corp")).toBeInTheDocument();
  });

  it("does not render company when specialization is empty", () => {
    const member = alumni({
      fullName: "No Company",
      specialization: [],
    });
    render(<AlumniCard member={member} />);

    expect(screen.queryByText("Acme Corp")).not.toBeInTheDocument();
  });

  it("renders both position and company when both provided", () => {
    const member = alumni({
      fullName: "Both Fields",
      position: "Manager",
      specialization: ["Tech Inc"],
    });
    render(<AlumniCard member={member} />);

    expect(screen.getByText("Manager")).toBeInTheDocument();
    expect(screen.getByText("Tech Inc")).toBeInTheDocument();
  });

  it("renders neither position nor company when both are missing", () => {
    const member = alumni({
      fullName: "No Fields",
      position: undefined,
      specialization: [],
    });
    render(<AlumniCard member={member} />);

    const card = screen.getAllByText("No Fields")[0].closest("article");
    expect(card).toBeInTheDocument();
    expect(card!.querySelectorAll("p")).toHaveLength(0);
  });

  it("renders photo", () => {
    const member = alumni({
      fullName: "Photo Test",
      photo: "https://example.com/photo.jpg",
    });
    render(<AlumniCard member={member} />);

    expect(screen.getByTestId("profile-photo")).toBeInTheDocument();
  });
});

describe("AlumniCard – angkatan displays as P prefix", () => {
  it("displays P prefix with angkatan value", () => {
    const member = alumni({
      fullName: "Angkatan Test",
      angkatan: 25,
    });
    render(<AlumniCard member={member} />);

    expect(screen.getByText("P25")).toBeInTheDocument();
    expect(screen.queryByText(/entryYear/i)).not.toBeInTheDocument();
  });
});
