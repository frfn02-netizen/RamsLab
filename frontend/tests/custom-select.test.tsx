import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import CustomSelect from "@/components/ui/custom-select";

const OPTIONS = [
  { value: "dosen", label: "Lecturer", description: "Runs meetings." },
  { value: "admin", label: "Admin", description: "Manages accounts." },
];

function Harness({ onChange = vi.fn() }: { onChange?: (value: string) => void }) {
  const [value, setValue] = useState("dosen");
  return (
    <CustomSelect
      ariaLabel="Account role"
      value={value}
      onChange={(next) => {
        setValue(next);
        onChange(next);
      }}
      options={OPTIONS}
    />
  );
}

describe("CustomSelect", () => {
  it("supports keyboard navigation and selection", () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    const trigger = screen.getByRole("combobox", { name: "Account role" });

    expect(trigger).toHaveTextContent("Lecturer");
    expect(trigger).toHaveAttribute("aria-expanded", "false");

    fireEvent.keyDown(trigger, { key: "Enter" });
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("listbox")).toBeInTheDocument();

    fireEvent.keyDown(trigger, { key: "ArrowDown" });
    fireEvent.keyDown(trigger, { key: "Enter" });

    expect(onChange).toHaveBeenCalledWith("admin");
    expect(trigger).toHaveTextContent("Admin");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    return waitFor(() =>
      expect(
        screen.queryByRole("option", { name: "Admin" }),
      ).not.toBeInTheDocument(),
    );
  });

  it("closes on Escape and outside pointer events", async () => {
    render(<Harness />);
    const trigger = screen.getByRole("combobox", { name: "Account role" });

    fireEvent.click(trigger);
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    fireEvent.keyDown(trigger, { key: "Escape" });
    await waitFor(() =>
      expect(screen.queryByRole("listbox")).not.toBeInTheDocument(),
    );

    fireEvent.click(trigger);
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    fireEvent.mouseDown(document.body);
    await waitFor(() =>
      expect(screen.queryByRole("listbox")).not.toBeInTheDocument(),
    );
  });

  it("marks the selected option and exposes descriptions", () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole("combobox", { name: "Account role" }));

    const selected = screen.getByRole("option", { name: "Lecturer" });
    expect(selected).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("Runs meetings.")).toBeInTheDocument();
    expect(screen.getByText("Manages accounts.")).toBeInTheDocument();
  });
});
