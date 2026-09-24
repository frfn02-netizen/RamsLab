import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
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

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
}));

const mockGetPublicAlumniById = vi.fn();

vi.mock("@/lib/api/modules", () => ({
  getPublicAlumniById: (...args: unknown[]) => mockGetPublicAlumniById(...args),
}));

vi.mock("@/components/public/reveal-on-scroll", () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock("@/components/public/public-states", () => ({
  PublicLoading: ({ label }: { label: string }) => <div>{label}</div>,
  PublicError: ({ message }: { message: string }) => <div>{message}</div>,
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

vi.mock("next/image", () => ({
  default: ({ alt, ...props }: { alt: string; [key: string]: unknown }) => (
    <img alt={alt} {...props} />
  ),
}));

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

describe("AlumniProfile – Back link navigation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does NOT navigate to /alumni portal", async () => {
    mockGetPublicAlumniById.mockResolvedValue(
      alumni({ id: "abc123", fullName: "Jane Smith" }),
    );

    render(<AlumniProfile id="abc123" />);

    await waitFor(() => {
      expect(screen.getByText("Jane Smith")).toBeInTheDocument();
    });

    const backLink = screen.getByText(/backToAlumni/i);
    expect(backLink.closest("a")).toHaveAttribute(
      "href",
      expect.not.stringMatching(/^\/alumni$/),
    );
  });

  it("navigates to /team?category=ALUMNI", async () => {
    mockGetPublicAlumniById.mockResolvedValue(
      alumni({ id: "abc123", fullName: "Jane Smith" }),
    );

    render(<AlumniProfile id="abc123" />);

    await waitFor(() => {
      expect(screen.getByText("Jane Smith")).toBeInTheDocument();
    });

    const backLink = screen.getByText(/backToAlumni/i);
    expect(backLink.closest("a")).toHaveAttribute(
      "href",
      "/team?category=ALUMNI",
    );
  });

  it("error state back link also navigates to /team?category=ALUMNI", async () => {
    mockGetPublicAlumniById.mockRejectedValue(new Error("Not found"));

    render(<AlumniProfile id="nonexistent" />);

    await waitFor(() => {
      expect(screen.getByText("error")).toBeInTheDocument();
    });

    const backLink = screen.getByText(/backToAlumni/i);
    expect(backLink.closest("a")).toHaveAttribute(
      "href",
      "/team?category=ALUMNI",
    );
  });
});

describe("AlumniProfile – UI rendering", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders valid public alumni profile correctly", async () => {
    mockGetPublicAlumniById.mockResolvedValue(
      alumni({
        id: "abc123",
        fullName: "Jane Smith",
        angkatan: 24,
        position: "Software Engineer",
        specialization: ["Tech Corp"],
        location: "Jakarta",
        bio: "Experienced engineer.",
        linkedin: "https://www.linkedin.com/in/janesmith",
      }),
    );

    render(<AlumniProfile id="abc123" />);

    await waitFor(() => {
      expect(screen.getByText("Jane Smith")).toBeInTheDocument();
    });

    expect(screen.getByText("Jane Smith")).toBeInTheDocument();
    expect(screen.getByText(/P24/)).toBeInTheDocument();
    expect(screen.getByText("Software Engineer")).toBeInTheDocument();
    expect(screen.getByText("Tech Corp")).toBeInTheDocument();
    expect(screen.getByText("Jakarta")).toBeInTheDocument();
    expect(screen.getByText("Experienced engineer.")).toBeInTheDocument();
    expect(screen.getByText("LinkedIn").closest("a")).toHaveAttribute(
      "href",
      "https://www.linkedin.com/in/janesmith",
    );
  });

  it("does not render non-public/unapproved alumni (API returns null)", async () => {
    mockGetPublicAlumniById.mockResolvedValue(null);

    render(<AlumniProfile id="nonexistent" />);

    await waitFor(() => {
      expect(screen.getByText("error")).toBeInTheDocument();
    });

    expect(screen.queryByText("nonexistent")).not.toBeInTheDocument();
  });

  it("hides optional fields when data is absent", async () => {
    mockGetPublicAlumniById.mockResolvedValue(
      alumni({
        id: "minimal-1",
        fullName: "Minimal Alumni",
        angkatan: undefined,
        position: undefined,
        specialization: [],
        location: undefined,
        bio: undefined,
        linkedin: undefined,
      }),
    );

    render(<AlumniProfile id="minimal-1" />);

    await waitFor(() => {
      expect(screen.getByText("Minimal Alumni")).toBeInTheDocument();
    });

    expect(screen.getByText("Minimal Alumni")).toBeInTheDocument();
    expect(screen.queryByText(/P\d+/)).not.toBeInTheDocument();
    expect(screen.queryByText(/LinkedIn/i)).not.toBeInTheDocument();
  });

  it("LinkedIn is rendered only when a valid URL exists", async () => {
    mockGetPublicAlumniById.mockResolvedValue(
      alumni({
        id: "no-linkedin-1",
        fullName: "No LinkedIn Alumni",
        linkedin: undefined,
      }),
    );

    render(<AlumniProfile id="no-linkedin-1" />);

    await waitFor(() => {
      expect(screen.getByText("No LinkedIn Alumni")).toBeInTheDocument();
    });

    expect(
      screen.queryByRole("link", { name: /linkedin/i }),
    ).not.toBeInTheDocument();
  });

  it("LinkedIn is rendered when URL is provided", async () => {
    mockGetPublicAlumniById.mockResolvedValue(
      alumni({
        id: "with-linkedin-1",
        fullName: "With LinkedIn Alumni",
        linkedin: "https://www.linkedin.com/in/testuser",
      }),
    );

    render(<AlumniProfile id="with-linkedin-1" />);

    await waitFor(() => {
      expect(screen.getByText("With LinkedIn Alumni")).toBeInTheDocument();
    });

    const linkedinLink = screen.getByText("LinkedIn").closest("a");
    expect(linkedinLink).toHaveAttribute(
      "href",
      "https://www.linkedin.com/in/testuser",
    );
    expect(linkedinLink).toHaveAttribute("target", "_blank");
    expect(linkedinLink).toHaveAttribute("rel", "noreferrer");
  });

  it("shows loading state while fetching", () => {
    mockGetPublicAlumniById.mockReturnValue(new Promise(() => {}));

    render(<AlumniProfile id="loading-1" />);

    expect(screen.getByText("loading")).toBeInTheDocument();
  });

  it("shows error state when API call fails", async () => {
    mockGetPublicAlumniById.mockRejectedValue(new Error("Network error"));

    render(<AlumniProfile id="error-1" />);

    await waitFor(() => {
      expect(screen.getByText("error")).toBeInTheDocument();
    });
  });
});
