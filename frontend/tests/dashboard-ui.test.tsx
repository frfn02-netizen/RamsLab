import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import DashboardPage from "@/app/dashboard/page";
import type { DashboardStats } from "@/types/dashboard";

const { getDashboardStats } = vi.hoisted(() => ({
  getDashboardStats: vi.fn(),
}));
vi.mock("@/lib/api/dashboard", () => ({ getDashboardStats }));
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
    render(<DashboardPage />);
    await waitFor(() =>
      expect(screen.getByText("Published Research")).toBeInTheDocument(),
    );
    expect(screen.getByText("Unpublished Research")).toBeInTheDocument();
    expect(
      screen.getByText(/Last site content update: homepage/),
    ).toBeInTheDocument();
  });
});
