import "dotenv/config";
import { MongoClient, Db } from "mongodb";

const uri = process.env.MONGODB_URI;
const dbName = process.env.DB_NAME;
const TEST_DATABASE_NAME = "rams_platform_security_test";

if (!uri) {
  throw new Error("MONGODB_URI is not defined");
}

if (!dbName) {
  throw new Error("DB_NAME is not defined");
}

export function assertDatabaseNameAllowed(
  databaseName: string,
  nodeEnv = process.env.NODE_ENV,
): void {
  if (nodeEnv === "test" && databaseName !== TEST_DATABASE_NAME) {
    throw new Error(
      "Refusing to connect: test mode requires the dedicated test database",
    );
  }

  // Prevent accidental production database access
  if (nodeEnv !== "production" && databaseName === "rams_platform") {
    throw new Error(
      "Refusing to connect to production database from development environment",
    );
  }
}

assertDatabaseNameAllowed(dbName);

const client = new MongoClient(uri);

let db: Db | null = null;

export async function connectDatabase(): Promise<Db> {
  if (db) {
    return db;
  }

  await client.connect();

  db = client.db(dbName);

  console.log(`✅ MongoDB connected to database: ${dbName}`);

  return db;
}

export function getDatabase(): Db {
  if (!db) {
    throw new Error("Database has not been connected");
  }

  return db;
}
