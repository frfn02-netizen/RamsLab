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

  it("does not render role line when title and position are absent", () => {
    const member = intern({
      fullName: "Arfan Saputra",
      title: undefined,
      position: undefined,
    });
    render(<MemberCard member={member} roleFallback="Role" />);

    const article = screen.getByRole("article");
    const paragraphs = article.querySelectorAll("p.mt-2.font-mono");
    expect(paragraphs.length).toBe(0);
  });

  it("renders specialization when present", () => {
    const member = intern({
      fullName: "Arfan Saputra",
      specialization: ["Marine Systems"],
    });
    render(<MemberCard member={member} roleFallback="Role" />);

    expect(screen.getByText("Marine Systems")).toBeInTheDocument();
  });

  it("renders multiple specializations joined by dot", () => {
    const member = intern({
      fullName: "Arfan Saputra",
      specialization: ["Reliability Engineering", "Safety Systems"],
    });
    render(<MemberCard member={member} roleFallback="Role" />);

    expect(
      screen.getByText("Reliability Engineering · Safety Systems"),
    ).toBeInTheDocument();
  });

  it("does not render specialization when array is empty", () => {
    const member = intern({
      fullName: "Arfan Saputra",
      specialization: [],
    });
    render(<MemberCard member={member} roleFallback="Role" />);

    const article = screen.getByRole("article");
    const specParagraph = article.querySelector("p.text-sm.leading-6");
    expect(specParagraph).toBeNull();
  });

  it("hides role and specialization lines when data is absent", () => {
    const member = intern({
      fullName: "Minimal Intern",
      title: undefined,
      position: undefined,
      specialization: [],
    });
    render(<MemberCard member={member} roleFallback="Role" />);

    expect(screen.getByText("Minimal Intern")).toBeInTheDocument();
    const article = screen.getByRole("article");
    const extraParagraphs = article.querySelectorAll("p.mt-2");
    expect(extraParagraphs.length).toBe(0);
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
