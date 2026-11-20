import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  ToastProvider,
  useToast,
} from "@/components/providers/toast-providers";

function Trigger() {
  const { success } = useToast();

  return (
    <button type="button" onClick={() => success("Saved successfully")}>
      Show toast
    </button>
  );
}

describe("ToastProvider", () => {
  it("renders toasts in a fixed portal below the header", () => {
    render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Show toast" }));

    const region = screen.getByLabelText("Notifications");
    expect(document.body).toContainElement(region);
    const style = region.getAttribute("style") ?? "";
    expect(style).toContain("position: fixed");
    expect(style).toContain("top: 80px");
    expect(style).toContain("z-index: 99999");
    expect(style).toContain("width: 360px");
    expect(style).toContain("max-width: calc(100vw - 32px)");
    expect(style).toContain("box-sizing: border-box");
    expect(screen.getByRole("status")).toHaveTextContent("Saved successfully");
  });

  it("does not render duplicate notifications", () => {
    render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>,
    );

    const trigger = screen.getByRole("button", { name: "Show toast" });
    fireEvent.click(trigger);
    fireEvent.click(trigger);

    expect(screen.getAllByText("Saved successfully")).toHaveLength(1);
  });
});
