import "dotenv/config";

const DEFAULT_TEST_MONGODB_URI = "mongodb://127.0.0.1:27017";
export const TEST_DATABASE_NAME = "rams_platform_security_test";

export function getTestDatabaseConfig(
  env: Pick<
    NodeJS.ProcessEnv,
    "MEETINGS_TEST_MONGODB_URI" | "MONGODB_URI"
  > = process.env,
) {
  const explicitTestUri = env.MEETINGS_TEST_MONGODB_URI?.trim();

  return {
    mongodbUri: explicitTestUri || DEFAULT_TEST_MONGODB_URI,
    dbName: TEST_DATABASE_NAME,
  };
}

// Keep security tests isolated from the development database and from any
// credentials/configuration used by the running application.
process.env.NODE_ENV = "test";
process.env.JWT_SECRET =
  "rams-local-security-test-secret-do-not-use-in-production";
const testDatabaseConfig = getTestDatabaseConfig();
process.env.MONGODB_URI = testDatabaseConfig.mongodbUri;
process.env.DB_NAME = testDatabaseConfig.dbName;
process.env.FRONTEND_URL = "http://localhost:3000";
