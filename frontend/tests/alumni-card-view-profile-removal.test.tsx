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

vi.mock("@/lib/api/modules", () => ({
  getPublicPeopleList: vi.fn(),
  getPublicAlumniById: vi.fn().mockResolvedValue({
    fullName: "Jane Smith",
    angkatan: 24,
    position: "Engineer",
    specialization: ["RAMS Lab"],
    photo: "",
    bio: "",
    linkedin: "https://www.linkedin.com/in/janesmith",
  }),
}));

vi.mock("@/components/public/reveal-on-scroll", () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock("@/components/public/public-states", () => ({
  PublicLoading: ({ label }: { label: string }) => <div>{label}</div>,
  PublicError: ({
    message,
    onRetry,
  }: {
    message: string;
    onRetry?: () => void;
  }) => (
    <div>
      {message}
      {onRetry && <button onClick={onRetry}>Retry</button>}
    </div>
  ),
  PublicEmpty: ({ title }: { title: string }) => <div>{title}</div>,
}));

vi.mock("@/components/public/public-container", () => ({
  default: ({
    children,
    className,
  }: {
    children: ReactNode;
    className?: string;
  }) => <div className={className}>{children}</div>,
}));

vi.mock("@/components/public/team-directory", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/components/public/team-directory")>();
  return {
    ...actual,
    ProfilePhoto: ({ name }: { name: string }) => (
      <div data-testid="profile-photo">{name}</div>
    ),
  };
});

import { MemberCard } from "@/components/public/team-directory";
import AlumniProfile from "@/components/public/alumni-profile";

function alumni(overrides: Partial<PublicPerson>): PublicPerson {
  return {
    id: "alumni-1",
    category: "ALUMNI",
    fullName: "Test Alumni",
    specialization: [],
    ...overrides,
  };
}

describe("MemberCard – Alumni on People/Team page", () => {
  it("does not render 'View profile' link for alumni", () => {
    const member = alumni({
      fullName: "Jane Smith",
      id: "abc123",
      linkedin: "https://www.linkedin.com/in/janesmith",
    });
    render(<MemberCard member={member} roleFallback="Role" />);

    expect(
      screen.queryByRole("link", { name: /profileLink/i }),
    ).not.toBeInTheDocument();
  });

  it("does not render LinkedIn link for alumni", () => {
    const member = alumni({
      fullName: "Jane Smith",
      id: "abc123",
      linkedin: "https://www.linkedin.com/in/janesmith",
    });
    render(<MemberCard member={member} roleFallback="Role" />);

    expect(
      screen.queryByRole("link", { name: /linkedin/i }),
    ).not.toBeInTheDocument();
  });

  it("renders alumni name as a clickable link to detail page", () => {
    const member = alumni({
      fullName: "Jane Smith",
      id: "abc123",
    });
    render(<MemberCard member={member} roleFallback="Role" />);

    const nameLink = screen.getByRole("link", { name: "Jane Smith" });
    expect(nameLink).toHaveAttribute("href", "/alumni/abc123");
  });

  it("renders alumni avatar", () => {
    const member = alumni({
      fullName: "Jane Smith",
      id: "abc123",
    });
    render(<MemberCard member={member} roleFallback="Role" />);

    expect(screen.getByLabelText("Jane Smith avatar")).toBeInTheDocument();
  });

  it("renders CLASS OF with graduation year", () => {
    const member = alumni({
      fullName: "John Doe",
      id: "def456",
      angkatan: 20,
    });
    render(<MemberCard member={member} roleFallback="Role" />);

    expect(screen.getByText("P20")).toBeInTheDocument();
  });

  it("does not render P prefix when angkatan is missing", () => {
    const member = alumni({
      fullName: "John Doe",
      id: "def456",
      angkatan: undefined,
    });
    render(<MemberCard member={member} roleFallback="Role" />);

    expect(screen.queryByText(/P\d+/)).not.toBeInTheDocument();
  });

  it("renders position when provided", () => {
    const member = alumni({
      fullName: "John Doe",
      id: "def456",
      angkatan: 20,
      position: "Software Engineer",
    });
    render(<MemberCard member={member} roleFallback="Role" />);

    expect(screen.getByText("Software Engineer")).toBeInTheDocument();
  });

  it("does not render position when missing", () => {
    const member = alumni({
      fullName: "John Doe",
      id: "def456",
      angkatan: 20,
      position: undefined,
    });
    render(<MemberCard member={member} roleFallback="Role" />);

    const card = screen.getAllByText("John Doe")[0].closest("article");
    expect(card).toBeInTheDocument();
    expect(screen.queryByText("Software Engineer")).not.toBeInTheDocument();
  });

  it("renders company when provided via specialization", () => {
    const member = alumni({
      fullName: "John Doe",
      id: "def456",
      angkatan: 20,
      specialization: ["Tech Corp"],
    });
    render(<MemberCard member={member} roleFallback="Role" />);

    expect(screen.getByText("Tech Corp")).toBeInTheDocument();
  });

  it("does not render company when specialization is empty", () => {
    const member = alumni({
      fullName: "John Doe",
      id: "def456",
      angkatan: 20,
      specialization: [],
    });
    render(<MemberCard member={member} roleFallback="Role" />);

    expect(screen.queryByText("Tech Corp")).not.toBeInTheDocument();
  });

  it("does not use entryYear for CLASS OF display", () => {
    const member = alumni({
      fullName: "Entry Year Test",
      id: "entry-1",
      angkatan: 25,
    });
    render(<MemberCard member={member} roleFallback="Role" />);

    expect(screen.getByText("P25")).toBeInTheDocument();
    expect(screen.queryByText(/entryYear/i)).not.toBeInTheDocument();
  });
});

describe("Alumni detail page LinkedIn", () => {
  it("still contains LinkedIn link", async () => {
    render(<AlumniProfile id="abc123" />);

    await waitFor(() => {
      expect(screen.getByText("Jane Smith")).toBeInTheDocument();
    });

    const linkedinLink = screen.getByText("LinkedIn");
    expect(linkedinLink.closest("a")).toHaveAttribute(
      "href",
      "https://www.linkedin.com/in/janesmith",
    );
  });
});
