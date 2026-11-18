import type { Client, InStatement } from "@libsql/client";
import { countries, currencies, departments } from "./reference-data";

export const DEMO_EMPLOYEE_COUNT = 10000;
const SEED_NAME = "demo-employees-v1";
const firstNames = ["Aarav", "Maya", "Elena", "James", "Hana", "Oliver", "Priya", "Noah", "Amira", "Lucas"];
const lastNames = ["Sharma", "Chen", "Weber", "Wilson", "Tanaka", "Patel", "Martin", "Singh", "Brown", "Garcia"];

export function generateDemoEmployees() {
  let state = 1729;
  function random() {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  }

  return Array.from({ length: DEMO_EMPLOYEE_COUNT }, (_, index) => {
    const country = countries[Math.floor(random() * countries.length)];
    const department = departments[Math.floor(random() * departments.length)];
    const pending = random() < 0.1;
    const units = currencies.find(currency => currency.code === country.currency)!.minorUnits;
    const salary = Math.floor((country.minSalary + random() * (country.maxSalary - country.minSalary)) / 100) * 100;
    const firstName = firstNames[index % firstNames.length];
    const lastName = lastNames[Math.floor(index / firstNames.length) % lastNames.length];

    return {
      fullName: `${firstName} ${lastName}`,
      department,
      countryCode: country.code,
      salaryMinor: pending ? null : salary * 10 ** units,
      currencyCode: pending ? null : country.currency,
    };
  });
}

export async function seedDemoEmployees(client: Client) {
  const employees = generateDemoEmployees();
  const statements: InStatement[] = [];
  // Keep each insert below SQLite's conservative 999-variable limit.
  for (let offset = 0; offset < employees.length; offset += 100) {
    const chunk = employees.slice(offset, offset + 100);
    statements.push({
      sql: `INSERT INTO employees (
        full_name, department, country_code, salary_minor, currency_code, created_at, updated_at
      ) VALUES ${chunk.map(() => "(?, ?, ?, ?, ?, ?, ?)").join(", ")}`,
      args: chunk.flatMap(employee => [
        employee.fullName, employee.department, employee.countryCode,
        employee.salaryMinor, employee.currencyCode,
        "2026-01-01T09:00:00.000Z", "2026-01-01T09:00:00.000Z",
      ]),
    });
  }

  const transaction = await client.transaction("write");
  try {
    const seeded = await transaction.execute({
      sql: "SELECT name FROM seed_runs WHERE name = ?", args: [SEED_NAME],
    });
    if (seeded.rows.length > 0) return { inserted: 0 };

    const existing = await transaction.execute("SELECT COUNT(*) AS count FROM employees");
    if (Number(existing.rows[0].count) !== 0) {
      throw new Error("Demo seeding requires an empty employee table. Existing records were preserved.");
    }

    await transaction.batch([
      ...statements,
      { sql: "INSERT INTO seed_runs (name) VALUES (?)", args: [SEED_NAME] },
    ]);
    await transaction.commit();
    return { inserted: employees.length };
  } finally {
    transaction.close();
  }
}
