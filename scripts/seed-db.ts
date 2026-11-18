import { createDatabaseClient } from "../src/lib/db/client";
import { applySchema } from "../src/lib/db/schema";
import { seedDemoEmployees } from "../src/lib/db/seed";

async function main() {
  const client = createDatabaseClient();
  try {
    await applySchema(client);
    const { inserted } = await seedDemoEmployees(client);
    const result = await client.execute(`SELECT
      COUNT(*) AS total,
      COUNT(DISTINCT employee_id) AS unique_ids,
      COUNT(*) - COUNT(salary_minor) AS pending
      FROM employees`);
    console.log(inserted ? `Seeded ${inserted} synthetic employees.` : "Demo seed was already applied; existing data was preserved.");
    console.log(result.rows[0]);
  } finally {
    client.close();
  }
}

main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
