import "server-only";
import { createDatabaseClient } from "./client";

let client: ReturnType<typeof createDatabaseClient> | undefined;

export function getDatabase() {
  client ??= createDatabaseClient();
  return client;
}
