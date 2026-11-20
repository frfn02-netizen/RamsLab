import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import AgendaCoordinatorsPage from "@/components/dashboard/agenda-coordinators/agenda-coordinators-page";
import type { AgendaCoordinatorStudent } from "@/types/agenda-coordinators";

const state = vi.hoisted(() => ({
  getStudents: vi.fn(),
  setAccess: vi.fn(),
  success: vi.fn(),
  notifyError: vi.fn(),
}));

vi.mock("@/components/providers/toast-providers", () => ({
  useToast: () => ({ success: state.success, error: state.notifyError }),
}));

vi.mock("@/lib/api/agenda-coordinators", () => ({
  getAgendaCoordinatorStudents: state.getStudents,
  setAgendaCoordinatorAccess: state.setAccess,
}));

function student(
  overrides: Partial<AgendaCoordinatorStudent> = {},
): AgendaCoordinatorStudent {
  return {
    id: "00000000000000000000f001",
    displayName: "Agenda Student",
    email: "agenda@test.local",
    role: "STUDENT",
    isActive: true,
    permissions: [],
    hasAgendaManage: false,
    hasSchedulePortalAccess: false,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  state.getStudents.mockResolvedValue({
    items: [
      student({
        hasAgendaManage: true,
        permissions: ["agenda.manage"],
      }),
      student({
        id: "00000000000000000000f002",
        displayName: "Schedule Student",
        email: "schedule@test.local",
        hasSchedulePortalAccess: true,
        permissions: ["schedule.portal.access"],
      }),
    ],
    pagination: { limit: 100, offset: 0, hasMore: false, nextOffset: null },
  });
  state.setAccess.mockImplementation(
    async (id: string, enabled: boolean) =>
      student({
        id,
        hasAgendaManage: enabled,
        permissions: enabled ? ["agenda.manage"] : [],
      }),
  );
});

describe("agenda coordinator administration", () => {
  it("shows coordinator and schedule status for student accounts", async () => {
    render(<AgendaCoordinatorsPage />);

    expect(await screen.findByText("Agenda Student")).toBeInTheDocument();
    expect(screen.getByText("Agenda Coordinator")).toBeInTheDocument();
    expect(screen.getByText("Standard student")).toBeInTheDocument();
    expect(screen.getByText("Schedule Portal")).toBeInTheDocument();
    expect(screen.getAllByText("Active account")).toHaveLength(2);
  });

  it("revokes and grants agenda coordinator access", async () => {
    render(<AgendaCoordinatorsPage />);
    await screen.findByText("Agenda Student");

    fireEvent.click(
      screen.getByRole("button", { name: "Revoke coordinator" }),
    );
    await waitFor(() =>
      expect(state.setAccess).toHaveBeenCalledWith(
        "00000000000000000000f001",
        false,
      ),
    );

    const scheduleRow = screen.getByText("Schedule Student").closest("li");
    expect(scheduleRow).not.toBeNull();
    fireEvent.click(
      within(scheduleRow as HTMLElement).getByRole("button", {
        name: "Make coordinator",
      }),
    );
    await waitFor(() =>
      expect(state.setAccess).toHaveBeenCalledWith(
        "00000000000000000000f002",
        true,
      ),
    );
  });

  it("searches student accounts by name or email", async () => {
    render(<AgendaCoordinatorsPage />);
    await screen.findByText("Agenda Student");

    fireEvent.change(screen.getByLabelText("Search student accounts"), {
      target: { value: "schedule" },
    });

    await waitFor(
      () =>
        expect(state.getStudents).toHaveBeenLastCalledWith({
          q: "schedule",
          limit: 100,
          offset: 0,
        }),
      { timeout: 1500 },
    );
  });
});
