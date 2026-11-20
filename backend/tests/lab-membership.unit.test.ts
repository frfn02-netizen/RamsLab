import { describe, expect, it } from "vitest";

import { readCurrentLabId } from "../src/config/lab.js";
import {
  addLabMembershipSchema,
  updateLabMembershipSchema,
} from "../src/modules/lab-memberships/lab-membership.schema.js";

describe("lab configuration", () => {
  it("uses the canonical RAMS lab id by default", () => {
    expect(readCurrentLabId({})).toBe("rams");
  });

  it("accepts an explicit safe lab id", () => {
    expect(readCurrentLabId({ RAMS_LAB_ID: "rams-lab" })).toBe("rams-lab");
  });

  it("rejects unsafe or malformed lab ids", () => {
    expect(() => readCurrentLabId({ RAMS_LAB_ID: "RAMS Lab" })).toThrow(
      "RAMS_LAB_ID",
    );
    expect(() => readCurrentLabId({ RAMS_LAB_ID: "../other" })).toThrow(
      "RAMS_LAB_ID",
    );
  });
});

describe("lab membership validation", () => {
  it("accepts a valid user id and status", () => {
    expect(
      addLabMembershipSchema.parse({
        userId: "00000000000000000000a001",
        labId: "ignored",
      }),
    ).toEqual({ userId: "00000000000000000000a001" });

    expect(updateLabMembershipSchema.parse({ status: "INACTIVE" })).toEqual({
      status: "INACTIVE",
    });
  });

  it("rejects malformed user ids and unknown statuses", () => {
    expect(addLabMembershipSchema.safeParse({ userId: "bad" }).success).toBe(
      false,
    );
    expect(
      updateLabMembershipSchema.safeParse({ status: "REMOVED" }).success,
    ).toBe(false);
  });
});
