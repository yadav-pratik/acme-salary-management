import { createDatabaseClient } from "../src/lib/db/client";
import { applySchema } from "../src/lib/db/schema";

async function main() {
  const client = createDatabaseClient();
  try {
    await applySchema(client);
    console.log("Database schema is ready.");
  } finally {
    client.close();
  }
}

main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
