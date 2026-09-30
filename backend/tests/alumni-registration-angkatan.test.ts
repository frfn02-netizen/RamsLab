import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { ObjectId } from "mongodb";

import app from "../src/app.js";
import { connectDatabase } from "../src/config/database.js";
import { getAlumniCollection } from "../src/modules/alumni/alumni.repository.js";
import { createAlumniShell } from "../src/modules/alumni/alumni.service.js";
import { getUsersCollection } from "../src/modules/users/user.repository.js";
import { ensureTestUsers } from "./auth-fixture.js";

const createdEmails: string[] = [];
const createdAlumniIds: ObjectId[] = [];
let sequence = 0;

beforeAll(async () => {
  if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET is required for alumni registration tests");
  await connectDatabase();
  await ensureTestUsers();
});

afterAll(async () => {
  await getAlumniCollection().deleteMany({ _id: { $in: createdAlumniIds } });
  await getUsersCollection().deleteMany({ email: { $in: createdEmails } });
});

function uniqueEmail(label: string) {
  sequence += 1;
  const email = `vitest.cohort.${label}.${sequence}.${Date.now()}@test.local`;
  createdEmails.push(email);
  return email;
}

async function readShell(email: string) {
  const user = await getUsersCollection().findOne({ email });
  return user?._id ? getAlumniCollection().findOne({ userId: user._id }) : null;
}

function register(payload: Record<string, unknown>) {
  return request(app).post("/api/auth/register").send(payload);
}

describe("alumni registration cohort year", () => {
  it.each([
    [2005, 45],
    [2015, 55],
  ])("stores P%s when Tahun Angkatan is %s", async (tahunAngkatan, expectedP) => {
    const email = uniqueEmail(String(tahunAngkatan));
    const registered = await register({
      fullName: "Cohort Alumni",
      tahunAngkatan,
      email,
      password: "VitestRegister1!",
      confirmPassword: "VitestRegister1!",
    });

    expect(registered.status).toBe(201);
    const shell = await readShell(email);
    expect(shell).toMatchObject({ tahunAngkatan, angkatan: expectedP });
  });

  it("rejects a registration without Tahun Angkatan, not a missing manual P", async () => {
    const email = uniqueEmail("missing-year");
    const registered = await register({
      fullName: "Missing Cohort Year",
      email,
      password: "VitestRegister1!",
      confirmPassword: "VitestRegister1!",
    });

    expect(registered.status).toBe(400);
    expect((registered.body.errors as Array<{ path: string[] }>)).toEqual(
      expect.arrayContaining([expect.objectContaining({ path: ["tahunAngkatan"] })]),
    );
    expect(await readShell(email)).toBeNull();
  });

  it("keeps direct shell creation compatible for existing callers", async () => {
    const withYear = await createAlumniShell(
      new ObjectId().toHexString(),
      "Helper Alumni",
      2015,
    );
    createdAlumniIds.push(withYear._id);
    expect(withYear).toMatchObject({ tahunAngkatan: 2015, angkatan: 55 });

    const legacy = await createAlumniShell(new ObjectId().toHexString());
    createdAlumniIds.push(legacy._id);
    expect(legacy.angkatan).toBeUndefined();
  });
});
