import { afterEach, describe, expect, it, vi } from "vitest";

import { getTestDatabaseConfig, TEST_DATABASE_NAME } from "./setup.js";

const originalEnvironment = {
  NODE_ENV: process.env.NODE_ENV,
  MONGODB_URI: process.env.MONGODB_URI,
  DB_NAME: process.env.DB_NAME,
};

afterEach(() => {
  process.env.NODE_ENV = originalEnvironment.NODE_ENV;
  process.env.MONGODB_URI = originalEnvironment.MONGODB_URI;
  process.env.DB_NAME = originalEnvironment.DB_NAME;
  vi.resetModules();
});

async function loadDatabaseModule(options: { dbName: string; uri?: string }) {
  process.env.NODE_ENV = "test";
  process.env.MONGODB_URI = options.uri ?? "mongodb://127.0.0.1:27017";
  process.env.DB_NAME = options.dbName;
  vi.resetModules();
  return import("../src/config/database.js");
}

describe("integration test database configuration", () => {
  it("uses the local URI by default and ignores the generic URI override", () => {
    expect(
      getTestDatabaseConfig({
        MONGODB_URI: "mongodb://development.example.invalid",
      }),
    ).toEqual({
      mongodbUri: "mongodb://127.0.0.1:27017",
      dbName: TEST_DATABASE_NAME,
    });
  });

  it("uses the explicit Meetings test URI override", () => {
    expect(
      getTestDatabaseConfig({
        MEETINGS_TEST_MONGODB_URI: "mongodb+srv://test-cluster.example.invalid",
        MONGODB_URI: "mongodb://development.example.invalid",
      }),
    ).toEqual({
      mongodbUri: "mongodb+srv://test-cluster.example.invalid",
      dbName: TEST_DATABASE_NAME,
    });
  });

  it("accepts the exact dedicated test database without connecting", async () => {
    const databaseModule = await loadDatabaseModule({
      dbName: TEST_DATABASE_NAME,
    });

    expect(databaseModule.assertDatabaseNameAllowed).toBeTypeOf("function");
  });

  it("retains the non-production guard for the production database", async () => {
    const databaseModule = await loadDatabaseModule({
      dbName: TEST_DATABASE_NAME,
    });

    expect(() =>
      databaseModule.assertDatabaseNameAllowed("rams_platform", "development"),
    ).toThrow("production database");
  });

  it.each(["rams_platform_dev", "rams_platform", "another_database"])(
    "rejects %s in test mode before connection",
    async (dbName) => {
      await expect(loadDatabaseModule({ dbName })).rejects.toThrow(
        "test mode requires the dedicated test database",
      );
    },
  );

  it("does not include URI credentials in a rejected configuration error", async () => {
    const sensitiveUri =
      "mongodb+srv://test-user:test-password@test-cluster.example.invalid";

    let error: unknown;
    try {
      await loadDatabaseModule({
        dbName: "rams_platform_dev",
        uri: sensitiveUri,
      });
    } catch (caught) {
      error = caught;
    }

    expect(String(error)).toContain(
      "test mode requires the dedicated test database",
    );
    expect(String(error)).not.toContain(sensitiveUri);
    expect(String(error)).not.toContain("test-password");
  });
});
