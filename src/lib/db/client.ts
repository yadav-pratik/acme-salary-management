import { createClient } from "@libsql/client";

export function createDatabaseClient(env: NodeJS.ProcessEnv = process.env) {
  const url = env.DATABASE_URL || "file:salary-management.db";
  if (!url.startsWith("file:") && !env.DATABASE_AUTH_TOKEN) {
    throw new Error("DATABASE_AUTH_TOKEN is required for a hosted database.");
  }
  if (env.NODE_ENV === "production" && url.startsWith("file:")) {
    throw new Error("Set DATABASE_URL to the persistent hosted database in production.");
  }
  return createClient({ url, authToken: env.DATABASE_AUTH_TOKEN });
}
