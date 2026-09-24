import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => "en",
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({
    href,
    children,
    ...props
  }: {
    href?: string;
    children: ReactNode;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

const { getPublicAlumniById } = vi.hoisted(() => ({
  getPublicAlumniById: vi.fn(),
}));
vi.mock("@/lib/api/modules", () => ({
  getPublicAlumniById,
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

vi.mock("@/components/public/public-states", () => ({
  PublicLoading: ({ label }: { label: string }) => (
    <div role="status">{label}</div>
  ),
  PublicError: ({ message }: { message: string }) => (
    <div role="alert">{message}</div>
  ),
}));

import AlumniProfile from "@/components/public/alumni-profile";

const mockProfile = {
  fullName: "Jane Smith",
  angkatan: 24,
  position: "Engineer",
  specialization: ["RAMS Lab"],
  photo: "",
  bio: "Researcher in marine systems.",
  linkedin: "https://linkedin.com/in/janesmith",
  location: "Surabaya",
};

describe("AlumniProfile – translation context", () => {
  it("renders with useTranslations from next-intl (not a local provider)", () => {
    getPublicAlumniById.mockResolvedValue(mockProfile);
    render(<AlumniProfile id="abc123" />);

    // "detailCategory" is a translation key from the alumni namespace
    // If useTranslations("alumni") works, it returns the key string in our mock
    return waitFor(() => {
      expect(screen.getByText("Jane Smith")).toBeInTheDocument();
      expect(screen.getByText("detailCategory")).toBeInTheDocument();
    });
  });

  it("shows loading key from translations", () => {
    getPublicAlumniById.mockReturnValue(new Promise(() => {}));
    render(<AlumniProfile id="abc123" />);
    expect(screen.getByRole("status")).toHaveTextContent("loading");
  });

  it("shows error key from translations on failure", async () => {
    getPublicAlumniById.mockRejectedValue(new Error("Not found"));
    render(<AlumniProfile id="bad-id" />);
    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("error");
    });
  });
});

describe("AlumniProfile – back link locale-aware href", () => {
  it("renders back link with /team?category=ALUMNI href", async () => {
    getPublicAlumniById.mockResolvedValue(mockProfile);
    render(<AlumniProfile id="abc123" />);
    await waitFor(() => {
      expect(screen.getByText("Jane Smith")).toBeInTheDocument();
    });
    const backLinks = screen.getAllByText(/backToAlumni/);
    backLinks.forEach((link) => {
      expect(link.closest("a")).toHaveAttribute(
        "href",
        "/team?category=ALUMNI",
      );
    });
  });
});

describe("AlumniProfile – detail rendering", () => {
  it("renders all profile fields when data loads", async () => {
    getPublicAlumniById.mockResolvedValue(mockProfile);
    render(<AlumniProfile id="abc123" />);
    await waitFor(() => {
      expect(screen.getByText("Jane Smith")).toBeInTheDocument();
    });
    expect(screen.getByText("Engineer")).toBeInTheDocument();
    expect(screen.getByText("RAMS Lab")).toBeInTheDocument();
    expect(screen.getByText("Surabaya")).toBeInTheDocument();
    expect(
      screen.getByText("Researcher in marine systems."),
    ).toBeInTheDocument();
  });

  it("renders LinkedIn link when provided", async () => {
    getPublicAlumniById.mockResolvedValue(mockProfile);
    render(<AlumniProfile id="abc123" />);
    await waitFor(() => {
      expect(screen.getByText("Jane Smith")).toBeInTheDocument();
    });
    const linkedinLink = screen.getByText("LinkedIn");
    expect(linkedinLink.closest("a")).toHaveAttribute(
      "href",
      "https://linkedin.com/in/janesmith",
    );
  });
});

describe("AlumniProfile – invalid alumni ID", () => {
  it("shows error state when API rejects", async () => {
    getPublicAlumniById.mockRejectedValue(new Error("404 Not Found"));
    render(<AlumniProfile id="nonexistent-id" />);
    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("error");
    });
    expect(screen.queryByText("Jane Smith")).not.toBeInTheDocument();
  });

  it("shows error state when API returns null", async () => {
    getPublicAlumniById.mockResolvedValue(null);
    render(<AlumniProfile id="null-id" />);
    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("error");
    });
  });
});
