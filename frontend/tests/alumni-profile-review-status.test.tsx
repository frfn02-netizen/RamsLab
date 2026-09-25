import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import AlumniReviewStatus from "@/components/profile/alumni-review-status";

function clearLocaleCookie() {
  document.cookie =
    "NEXT_LOCALE=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
}

afterEach(() => {
  cleanup();
  clearLocaleCookie();
});

describe("Alumni review status", () => {
  it("shows the rejection reason when the profile is rejected", async () => {
    render(
      <AlumniReviewStatus
        reviewStatus="REJECTED"
        reviewNote="Data pekerjaan belum lengkap. Mohon lengkapi nama perusahaan dan jabatan."
      />,
    );

    expect(await screen.findByText("Profile rejected")).toBeInTheDocument();
    expect(screen.getByText("Reason from reviewer")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Data pekerjaan belum lengkap. Mohon lengkapi nama perusahaan dan jabatan.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/save your changes to resubmit it for review/i),
    ).toBeInTheDocument();
    expect(screen.getByText("Rejected")).toBeInTheDocument();
  });

  it("does not show the rejection message while the profile is pending", async () => {
    render(
      <AlumniReviewStatus
        reviewStatus="PENDING"
        reviewNote="Stale note from an older round"
      />,
    );

    expect(await screen.findByText("Pending review")).toBeInTheDocument();
    expect(screen.queryByText("Profile rejected")).not.toBeInTheDocument();
    expect(
      screen.queryByText("Reason from reviewer"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/save your changes to resubmit/i),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("Stale note from an older round"),
    ).not.toBeInTheDocument();
  });

  it("does not show the rejection message when the profile is approved", async () => {
    render(
      <AlumniReviewStatus
        reviewStatus="APPROVED"
        reviewNote="Should not be shown anymore"
      />,
    );

    expect(await screen.findByText("Approved")).toBeInTheDocument();
    expect(screen.queryByText("Profile rejected")).not.toBeInTheDocument();
    expect(
      screen.queryByText("Reason from reviewer"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("Should not be shown anymore"),
    ).not.toBeInTheDocument();
  });

  it("renders a long rejection reason in full", async () => {
    const longReason = `${"Data pekerjaan belum lengkap. Mohon lengkapi nama perusahaan dan jabatan. ".repeat(20)}Selesai.`;

    render(
      <AlumniReviewStatus reviewStatus="REJECTED" reviewNote={longReason} />,
    );

    expect(await screen.findByText("Profile rejected")).toBeInTheDocument();
    const reason = screen.getByText(longReason);
    expect(reason).toBeInTheDocument();
    expect(reason).toHaveClass("break-words");
    expect(reason).toHaveClass("whitespace-pre-wrap");
  });

  it("renders the Indonesian copy when the locale cookie is set", async () => {
    document.cookie = "NEXT_LOCALE=id";

    render(
      <AlumniReviewStatus
        reviewStatus="REJECTED"
        reviewNote="Data pekerjaan belum lengkap."
      />,
    );

    expect(await screen.findByText("Profil ditolak")).toBeInTheDocument();
    expect(screen.getByText("Alasan dari reviewer")).toBeInTheDocument();
    expect(
      screen.getByText(/Silakan perbaiki profil sesuai catatan di atas/),
    ).toBeInTheDocument();
    expect(screen.getByText("Status Profil")).toBeInTheDocument();
    expect(screen.queryByText("Profile rejected")).not.toBeInTheDocument();
  });

  it("shows the pending status without any reviewer note", async () => {
    render(<AlumniReviewStatus reviewStatus="PENDING" />);

    expect(await screen.findByText("Pending review")).toBeInTheDocument();
    expect(screen.getByText("Profile Status")).toBeInTheDocument();
    expect(
      screen.queryByText("Reason from reviewer"),
    ).not.toBeInTheDocument();
  });
});
