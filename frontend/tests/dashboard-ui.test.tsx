import { render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import DashboardPage from "@/app/(internal)/dashboard/page";
import type { DashboardStats } from "@/types/dashboard";
import type { MeetingCalendarEvent } from "@/types/meetings";
import type { Publication } from "@/types/modules";

const { getDashboardStats, getMeetingAgenda, getPartners, getPublications } =
  vi.hoisted(() => ({
    getDashboardStats: vi.fn(),
    getMeetingAgenda: vi.fn(),
    getPartners: vi.fn(),
    getPublications: vi.fn(),
  }));
vi.mock("@/lib/api/dashboard", () => ({ getDashboardStats }));
vi.mock("@/lib/api/meetings", () => ({ getMeetingAgenda }));
vi.mock("@/lib/api/modules", () => ({ getPartners, getPublications }));
vi.mock("@/components/providers/auth-providers", () => ({
  useAuth: () => ({
    user: { role: "ADMIN", email: "admin@example.com" },
    status: "authenticated",
  }),
}));

const stats: DashboardStats = {
  users: 4,
  alumni: 3,
  dosen: 2,
  projects: 5,
  publications: 0,
  universityPartners: 6,
  industrialPartners: 7,
  researchAreas: 6,
  publishedResearchAreas: 5,
  unpublishedResearchAreas: 1,
  latestSiteContentUpdatedAt: "2026-08-18T00:00:00.000Z",
  latestSiteContentKey: "homepage",
};

describe("dashboard overview", () => {
  it("renders CMS overview values from the dashboard API", async () => {
    getDashboardStats.mockResolvedValue(stats);
    getMeetingAgenda.mockResolvedValue({
      items: [],
      pagination: { limit: 200, offset: 0, hasMore: false, nextOffset: null },
    });
    getPartners.mockResolvedValue([]);
    getPublications.mockResolvedValue({
      success: true,
      data: [],
      total: 0,
      page: 1,
      limit: 200,
      facets: { years: [], topics: [], methods: [] },
    });
    render(<DashboardPage />);
    await waitFor(() =>
      expect(screen.getByText("Published Research")).toBeInTheDocument(),
    );
    expect(screen.getByText("Unpublished Research")).toBeInTheDocument();
    expect(screen.getByText("Site content updated")).toBeInTheDocument();
    expect(screen.getByText("Homepage")).toBeInTheDocument();
  });

  it("renders meeting and publication sections from supported API data", async () => {
    const meeting: MeetingCalendarEvent = {
      _id: "meeting-1",
      title: "AI for Marine Research",
      startAt: "2030-11-12T10:19:00.000Z",
      endAt: "2030-11-12T11:00:00.000Z",
      createdBy: null,
      canViewDetails: false,
    };
    const publication: Publication = {
      _id: "publication-1",
      title: "Marine systems study",
      authors: ["RAMS Lab"],
      publicationType: "Article",
      year: 2025,
      journal: "RAMS Journal",
      doi: null,
      pdfUrl: null,
      topics: [],
      methods: [],
      createdAt: "2025-04-01T00:00:00.000Z",
      updatedAt: "2026-11-11T00:00:00.000Z",
    };

    getDashboardStats.mockResolvedValue({ ...stats, publications: 1 });
    getMeetingAgenda.mockResolvedValue({
      items: [meeting],
      pagination: { limit: 200, offset: 0, hasMore: false, nextOffset: null },
    });
    getPartners.mockResolvedValue([]);
    getPublications.mockResolvedValue({
      success: true,
      data: [publication],
      total: 1,
      page: 1,
      limit: 200,
      facets: { years: [2025], topics: [], methods: [] },
    });

    render(<DashboardPage />);

    await waitFor(() =>
      expect(screen.getByText("AI for Marine Research")).toBeInTheDocument(),
    );
    expect(screen.getByLabelText("1 publications in 2025")).toBeInTheDocument();
    expect(screen.getByText("Marine systems study")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /AI for Marine Research/i }),
    ).toHaveAttribute("href", "/dashboard/meetings/meeting-1");
  });

  it("points Upcoming Meetings actions at dashboard-relative routes", async () => {
    getDashboardStats.mockResolvedValue(stats);
    getMeetingAgenda.mockResolvedValue({
      items: [],
      pagination: { limit: 200, offset: 0, hasMore: false, nextOffset: null },
    });
    getPartners.mockResolvedValue([]);
    getPublications.mockResolvedValue({
      success: true,
      data: [],
      total: 0,
      page: 1,
      limit: 200,
      facets: { years: [], topics: [], methods: [] },
    });

    render(<DashboardPage />);

    const heading = await screen.findByRole("heading", {
      name: "Upcoming Meetings",
    });
    const panel = heading.closest("section");
    expect(panel).not.toBeNull();

    expect(
      within(panel as HTMLElement).getByRole("link", { name: /View calendar/i }),
    ).toHaveAttribute("href", "/dashboard/meetings/calendar");
    expect(
      within(panel as HTMLElement).getByRole("link", {
        name: /Schedule meeting/i,
      }),
    ).toHaveAttribute("href", "/dashboard/meetings/new");
    expect(
      within(panel as HTMLElement).getByRole("link", { name: /Open calendar/i }),
    ).toHaveAttribute("href", "/dashboard/meetings/calendar");

    const quickActions = screen
      .getByRole("heading", { name: "Quick Actions" })
      .closest("section");
    expect(quickActions).not.toBeNull();
    expect(
      within(quickActions as HTMLElement).getByRole("link", {
        name: /Schedule meeting/i,
      }),
    ).toHaveAttribute("href", "/dashboard/meetings/new");
  });
});
