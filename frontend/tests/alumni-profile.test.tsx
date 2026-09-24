import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...props }: any) => (
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
  default: ({ children, className }: any) => (
    <div className={className}>{children}</div>
  ),
}));

vi.mock("@/components/public/public-states", () => ({
  PublicLoading: ({ label }: any) => <div role="status">{label}</div>,
  PublicError: ({ message }: any) => <div role="alert">{message}</div>,
}));

import AlumniProfile from "@/components/public/alumni-profile";

describe("AlumniProfile", () => {
  it("shows loading state initially", () => {
    getPublicAlumniById.mockReturnValue(new Promise(() => {}));
    render(<AlumniProfile id="abc123" />);
    expect(screen.getByRole("status")).toHaveTextContent("loading");
  });

  it("renders profile with translations when data loads", async () => {
    getPublicAlumniById.mockResolvedValue({
      fullName: "Jane Smith",
      angkatan: 24,
      position: "Engineer",
      specialization: ["RAMS Lab"],
      photo: "",
      bio: "",
      linkedin: "",
      location: "Surabaya",
    });
    render(<AlumniProfile id="abc123" />);
    await waitFor(() =>
      expect(screen.getByText("Jane Smith")).toBeInTheDocument(),
    );
    expect(screen.getByText("detailCategory")).toBeInTheDocument();
    expect(screen.getByText(/P24/)).toBeInTheDocument();
  });

  it("shows error state and back link on failure", async () => {
    getPublicAlumniById.mockRejectedValue(new Error("Not found"));
    render(<AlumniProfile id="bad-id" />);
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent("error"),
    );
    const backLink = screen.getByText(/backToAlumni/);
    expect(backLink.closest("a")).toHaveAttribute(
      "href",
      "/team?category=ALUMNI",
    );
  });

  it("back link points to locale-aware /team?category=ALUMNI route", async () => {
    getPublicAlumniById.mockResolvedValue({
      fullName: "Test User",
      angkatan: 23,
      position: "",
      specialization: [],
      photo: "",
      bio: "",
      linkedin: "",
    });
    render(<AlumniProfile id="test-id" />);
    await waitFor(() =>
      expect(screen.getByText("Test User")).toBeInTheDocument(),
    );
    const backLink = screen.getByText(/backToAlumni/);
    expect(backLink.closest("a")).toHaveAttribute(
      "href",
      "/team?category=ALUMNI",
    );
  });
});
