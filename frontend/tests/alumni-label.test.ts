import { describe, expect, it } from "vitest";
import { formatAlumniClassLabel } from "@/lib/alumni-label";

describe("formatAlumniClassLabel", () => {
  it("renders the year together with the batch number", () => {
    expect(
      formatAlumniClassLabel({ angkatan: 55, tahunAngkatan: 2015 }, "Class of"),
    ).toBe("Class of 2015 (P55)");
  });

  it("uses the required Class of 2005 (P45) display format", () => {
    expect(
      formatAlumniClassLabel({ angkatan: 45, tahunAngkatan: 2005 }, "Class of"),
    ).toBe("Class of 2005 (P45)");
  });

  it("falls back to the batch number alone for alumni saved before the year field", () => {
    expect(formatAlumniClassLabel({ angkatan: 55 }, "Class of")).toBe(
      "Class of P55",
    );
  });

  it("renders the year alone when the batch number is missing", () => {
    expect(
      formatAlumniClassLabel(
        { angkatan: undefined, tahunAngkatan: 2015 },
        "Class of",
      ),
    ).toBe("Class of 2015");
  });

  it("returns null when both values are missing so callers render nothing", () => {
    expect(formatAlumniClassLabel({}, "Class of")).toBeNull();
    expect(
      formatAlumniClassLabel(
        { angkatan: undefined, tahunAngkatan: undefined },
        "Class of",
      ),
    ).toBeNull();
    expect(
      formatAlumniClassLabel(
        { angkatan: null, tahunAngkatan: null },
        "Class of",
      ),
    ).toBeNull();
    expect(formatAlumniClassLabel(null, "Class of")).toBeNull();
    expect(formatAlumniClassLabel(undefined, "Class of")).toBeNull();
  });

  it("uses the label the caller translates", () => {
    expect(
      formatAlumniClassLabel({ angkatan: 55, tahunAngkatan: 2015 }, "Angkatan"),
    ).toBe("Angkatan 2015 (P55)");
    expect(formatAlumniClassLabel({ angkatan: 55 }, "Angkatan")).toBe(
      "Angkatan P55",
    );
  });

  it("treats zero as missing instead of rendering P0", () => {
    expect(
      formatAlumniClassLabel({ angkatan: 0, tahunAngkatan: 0 }, "Class of"),
    ).toBeNull();
  });
});
