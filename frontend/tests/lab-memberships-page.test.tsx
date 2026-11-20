import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import LabMembershipsPage from "@/components/dashboard/lab-memberships/lab-memberships-page";
import type {
  LabMembershipRecord,
  LabMembershipPage,
} from "@/types/lab-membership";

const state = vi.hoisted(() => ({
  getLabMemberships: vi.fn(),
  searchLabMembershipCandidates: vi.fn(),
  addLabMembership: vi.fn(),
  updateLabMembershipStatus: vi.fn(),
  deactivateLabMembership: vi.fn(),
  success: vi.fn(),
  notifyError: vi.fn(),
}));

vi.mock("@/components/providers/toast-providers", () => ({
  useToast: () => ({ success: state.success, error: state.notifyError }),
}));

vi.mock("@/lib/api/lab-memberships", () => ({
  getLabMemberships: state.getLabMemberships,
  searchLabMembershipCandidates: state.searchLabMembershipCandidates,
  addLabMembership: state.addLabMembership,
  updateLabMembershipStatus: state.updateLabMembershipStatus,
  deactivateLabMembership: state.deactivateLabMembership,
}));

function membership(
  overrides: Partial<LabMembershipRecord> = {},
): LabMembershipRecord {
  return {
    userId: "00000000000000000000a001",
    labId: "rams",
    status: "ACTIVE",
    joinedAt: "2042-01-01T00:00:00.000Z",
    updatedAt: "2042-01-01T00:00:00.000Z",
    user: {
      id: "00000000000000000000a001",
      displayName: "Dosen Member",
      email: "member@example.com",
      role: "DOSEN",
      isActive: true,
    },
    createdBy: null,
    updatedBy: null,
    ...overrides,
  };
}

function page(items: LabMembershipRecord[]): LabMembershipPage {
  return {
    items,
    pagination: { limit: 100, offset: 0, hasMore: false, nextOffset: null },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  state.getLabMemberships.mockResolvedValue(page([membership()]));
  state.searchLabMembershipCandidates.mockResolvedValue([]);
  state.addLabMembership.mockResolvedValue(membership());
  state.updateLabMembershipStatus.mockResolvedValue(
    membership({ status: "ACTIVE" }),
  );
  state.deactivateLabMembership.mockResolvedValue(
    membership({ status: "INACTIVE" }),
  );
});

describe("lab membership administration", () => {
  it("lists members and adds a searched account", async () => {
    state.searchLabMembershipCandidates.mockResolvedValue([
      {
        id: "00000000000000000000a002",
        displayName: "Alumni Member",
        email: "alumni@example.com",
        role: "ALUMNI",
        isActive: true,
      },
    ]);

    render(<LabMembershipsPage />);
    expect(await screen.findByText("Dosen Member")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Search eligible accounts"), {
      target: { value: "alumni" },
    });
    expect(await screen.findByText("Alumni Member")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Add member" }));
    await waitFor(() =>
      expect(state.addLabMembership).toHaveBeenCalledWith(
        "00000000000000000000a002",
      ),
    );
  });

  it("confirms deactivation and reactivates inactive members", async () => {
    state.getLabMemberships.mockResolvedValue(
      page([
        membership(),
        membership({
          userId: "00000000000000000000a003",
          status: "INACTIVE",
          user: {
            id: "00000000000000000000a003",
            displayName: "Inactive Member",
            email: "inactive@example.com",
            role: "ALUMNI",
            isActive: true,
          },
        }),
      ]),
    );

    render(<LabMembershipsPage />);
    await screen.findByText("Dosen Member");

    fireEvent.click(screen.getAllByRole("button", { name: "Deactivate" })[0]);
    const dialog = screen.getByRole("dialog");
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Deactivate" }),
    );
    await waitFor(() =>
      expect(state.deactivateLabMembership).toHaveBeenCalledWith(
        "00000000000000000000a001",
      ),
    );

    fireEvent.click(screen.getByRole("button", { name: "Reactivate" }));
    await waitFor(() =>
      expect(state.updateLabMembershipStatus).toHaveBeenCalledWith(
        "00000000000000000000a003",
        "ACTIVE",
      ),
    );
  });
});
