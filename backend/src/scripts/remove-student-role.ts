import dotenv from "dotenv";

import { connectDatabase, getDatabase } from "../config/database.js";

dotenv.config();

async function migrate() {
  const apply = process.argv.includes("--apply");

  await connectDatabase();
  const users = getDatabase().collection("users");
  const legacy = await users
    .find({ role: "STUDENT" })
    .project({ email: 1 })
    .toArray();

  if (legacy.length === 0) {
    console.log("No legacy STUDENT accounts found.");
    return;
  }

  console.log(`Found ${legacy.length} legacy STUDENT account(s):`);
  for (const user of legacy) {
    console.log(`- ${user.email ?? user._id.toString()}`);
  }

  if (!apply) {
    console.log("Dry run only. Re-run with --apply to deactivate them.");
    return;
  }

  const result = await users.updateMany(
    { role: "STUDENT" },
    {
      $set: { isActive: false, updatedAt: new Date() },
      $inc: { tokenVersion: 1 },
      $unset: { nim: "", department: "", program: "", permissions: "" },
    },
  );

  console.log(
    `Deactivated ${result.modifiedCount} legacy STUDENT account(s).`,
  );
}

migrate()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("Failed to migrate legacy STUDENT accounts:", error);
    process.exit(1);
  });