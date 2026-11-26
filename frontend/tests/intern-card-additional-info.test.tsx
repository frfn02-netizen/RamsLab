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

vi.mock("@/components/public/reveal-on-scroll", () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
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

import { MemberCard } from "@/components/public/team-directory";

function intern(overrides: Partial<PublicPerson>): PublicPerson {
  return {
    id: "intern-1",
    category: "INTERNSHIP",
    fullName: "Test Intern",
    specialization: [],
    ...overrides,
  };
}

describe("MemberCard – Vocational Intern additional info", () => {
  it("renders role line when title is present", () => {
    const member = intern({
      fullName: "Arfan Saputra",
      title: "Software Engineering",
    });
    render(<MemberCard member={member} roleFallback="Role" />);

    expect(screen.getByText(/software engineering/i)).toBeInTheDocument();
  });

  it("renders role line when position is present", () => {
    const member = intern({
      fullName: "Arfan Saputra",
      position: "Backend Development",
    });
    render(<MemberCard member={member} roleFallback="Role" />);

    expect(screen.getByText(/backend development/i)).toBeInTheDocument();
  });

  it("renders role line with both title and position", () => {
    const member = intern({
      fullName: "Arfan Saputra",
      title: "Software Engineering",
      position: "Backend Development",
    });
    render(<MemberCard member={member} roleFallback="Role" />);

    const roleElement = screen.getByText(/software engineering/i);
    expect(roleElement).toHaveTextContent(
      "Software Engineering · Backend Development",
    );
  });

  it("falls back to the category label when title and position are absent", () => {
    const member = intern({
      fullName: "Arfan Saputra",
      title: undefined,
      position: undefined,
    });
    render(<MemberCard member={member} roleFallback="Role" />);

    const role = screen.getByText("Role");
    expect(role).toHaveClass("text-red-700");
    expect(role).toHaveClass("uppercase");
  });

  it("renders specialization when present", () => {
    const member = intern({
      fullName: "Arfan Saputra",
      specialization: ["Marine Systems"],
    });
    render(<MemberCard member={member} roleFallback="Role" />);

    expect(screen.getByText("Marine Systems")).toBeInTheDocument();
  });

  it("renders specializations as dot-separated plain text", () => {
    const member = intern({
      fullName: "Arfan Saputra",
      specialization: ["Reliability Engineering", "Safety Systems"],
    });
    render(<MemberCard member={member} roleFallback="Role" />);

    const focus = screen.getByText(
      "Reliability Engineering · Safety Systems",
    );
    expect(focus.className).toContain("text-[11px]");
    expect(focus.className).toContain("text-stone-500");
    expect(focus.closest("article")!.querySelectorAll("li")).toHaveLength(0);
  });

  it("renders every specialization topic without pill badges", () => {
    const member = intern({
      fullName: "Arfan Saputra",
      specialization: ["One", "Two", "Three", "Four"],
    });
    render(<MemberCard member={member} roleFallback="Role" />);

    expect(screen.getByText("One · Two · Three · Four")).toBeInTheDocument();
    const article = screen.getByRole("article");
    expect(article.querySelectorAll("li")).toHaveLength(0);
  });

  it("does not render a focus line when the array is empty", () => {
    const member = intern({
      fullName: "Arfan Saputra",
      specialization: [],
    });
    render(<MemberCard member={member} roleFallback="Role" />);

    const article = screen.getByRole("article");
    const paragraphs = article.querySelectorAll("p");
    expect(paragraphs).toHaveLength(1);
  });

  it("hides the focus line when specialization data is absent", () => {
    const member = intern({
      fullName: "Minimal Intern",
      title: undefined,
      position: undefined,
      specialization: [],
    });
    render(<MemberCard member={member} roleFallback="Role" />);

    expect(screen.getByText("Minimal Intern")).toBeInTheDocument();
    const article = screen.getByRole("article");
    expect(article.querySelectorAll("p")).toHaveLength(1);
  });

  it("renders intern name as clickable link to team detail", () => {
    const member = intern({
      fullName: "Arfan Saputra",
      id: "intern-abc",
    });
    render(<MemberCard member={member} roleFallback="Role" />);

    const nameLink = screen.getByRole("link", { name: "Arfan Saputra" });
    expect(nameLink).toHaveAttribute("href", "/team/intern-abc");
  });
});
