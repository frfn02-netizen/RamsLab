import "dotenv/config";
import { MongoClient, Db } from "mongodb";

const uri = process.env.MONGODB_URI;

if (!uri) {
  throw new Error("MONGODB_URI is not defined");
}

const client = new MongoClient(uri);

let db: Db | null = null;

export async function connectDatabase(): Promise<Db> {
  if (db) {
    return db;
  }

  await client.connect();

  db = client.db(process.env.DB_NAME || "rams_platform");

  console.log("✅ MongoDB connected");

  return db;
}

export function getDatabase(): Db {
  if (!db) {
    throw new Error("Database has not been connected");
  }

  return db;
}