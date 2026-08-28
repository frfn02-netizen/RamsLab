import "dotenv/config";

// Keep security tests isolated from the development database and from any
// credentials/configuration used by the running application.
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "rams-local-security-test-secret-do-not-use-in-production";
process.env.MONGODB_URI = "mongodb://127.0.0.1:27017";
process.env.DB_NAME = "rams_platform_security_test";
process.env.FRONTEND_URL = "http://localhost:3000";
