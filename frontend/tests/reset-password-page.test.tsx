import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import ResetPasswordPage from "@/app/(internal)/reset-password/page";

describe("reset password page", () => {
  beforeEach(() => {
    window.history.replaceState(null, "", "/reset-password");
  });

  afterEach(() => {
    window.history.replaceState(null, "", "/");
  });

  it("reads the reset token from the URL fragment and removes it from the address bar", async () => {
    window.location.hash = "#token=test-reset-token-value";
    render(<ResetPasswordPage />);

    await waitFor(() =>
      expect(screen.getByLabelText("New password")).toBeInTheDocument(),
    );
    expect(window.location.hash).toBe("");
  });

  it("shows a missing-token state when the fragment is absent", async () => {
    render(<ResetPasswordPage />);

    await waitFor(() =>
      expect(
        screen.getByText("This reset link is missing a token."),
      ).toBeInTheDocument(),
    );
  });
});
