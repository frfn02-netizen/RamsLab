import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import enMessages from "@/messages/en.json";
import idMessages from "@/messages/id.json";

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
  tahunAngkatan: 2024,
  program: "Naval Architecture",
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
    expect(screen.getByText("Naval Architecture")).toBeInTheDocument();
    expect(screen.getByText("classOf 2024 (P24)")).toBeInTheDocument();
    expect(screen.getByText("programLabel")).toBeInTheDocument();
    expect(screen.getByText("positionLabel")).toBeInTheDocument();
    expect(screen.getByText("companyLabel")).toBeInTheDocument();
    expect(screen.getByText("locationLabel")).toBeInTheDocument();
    const metadataGrid = screen.getByTestId("alumni-metadata-grid");
    expect(metadataGrid).toHaveClass("grid", "sm:grid-cols-2");
    expect(metadataGrid).not.toHaveClass("border-b");

    const metadataFields: Array<[label: string, value: string]> = [
      ["programLabel", "Naval Architecture"],
      ["positionLabel", "Engineer"],
      ["companyLabel", "RAMS Lab"],
      ["locationLabel", "Surabaya"],
    ];
    for (const [label, value] of metadataFields) {
      const term = screen.getByText(label);
      // Small uppercase tracking label, no per-field border or divider.
      expect(term).toHaveClass("uppercase");
      expect(term.parentElement).not.toHaveClass("border-t");
      // The value is the enlarged editorial size, never the old text-base.
      const definition = term.nextElementSibling;
      expect(definition).toHaveTextContent(value);
      expect(definition).toHaveClass("text-lg");
      expect(definition).not.toHaveClass("text-base");
    }

    // Class of and BIO keep their own sizes: only the four metadata values
    // are rendered at text-lg.
    expect(screen.getByText("classOf 2024 (P24)")).toHaveClass("text-sm");
    expect(screen.getByText("Researcher in marine systems.")).toHaveClass(
      "text-base",
    );
    expect(screen.getByText("bioLabel").closest("section")).toHaveClass(
      "border-t",
    );
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
    expect(linkedinLink.closest("a")).toHaveAttribute(
      "rel",
      "noreferrer",
    );
  });

  it("omits empty optional detail sections", async () => {
    getPublicAlumniById.mockResolvedValue({
      ...mockProfile,
      program: " ",
      position: "",
      specialization: ["  "],
      location: " ",
      bio: "",
      linkedin: "",
    });
    render(<AlumniProfile id="abc123" />);

    await waitFor(() => {
      expect(screen.getByText("Jane Smith")).toBeInTheDocument();
    });

    for (const label of [
      "programLabel",
      "positionLabel",
      "companyLabel",
      "locationLabel",
      "bioLabel",
      "LinkedIn",
    ]) {
      expect(screen.queryByText(label)).not.toBeInTheDocument();
    }
  });

  it("keeps the approved 2x2 copy, with location meaning the alumni's current location", () => {
    // The public card mirrors the alumni profile form: `location` is labelled
    // "Current Location" there, so the public label must not read as a work
    // location (that is what `currentPosition` / `currentCompany` are for).
    expect(enMessages.alumni.locationLabel).toBe("Current Location");
    expect(idMessages.alumni.locationLabel).toBe("Lokasi saat ini");

    expect(enMessages.alumni.programLabel).toBe("Program");
    expect(enMessages.alumni.positionLabel).toBe("Current position");
    expect(enMessages.alumni.companyLabel).toBe("Company");
    expect(enMessages.alumni.bioLabel).toBe("BIO");
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
