import { createClient, type Client } from "@libsql/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { applySchema } from "./schema";
import { DEMO_EMPLOYEE_COUNT, generateDemoEmployees, seedDemoEmployees } from "./seed";
import { createDatabaseClient } from "./client";

let client: Client;

beforeEach(async () => {
  client = createClient({ url: "file::memory:" });
  await applySchema(client);
});

afterEach(() => client.close());

async function addEmployee(salaryMinor: number | null = null, currency: string | null = null) {
  return client.execute({
    sql: `INSERT INTO employees (full_name, department, country_code, salary_minor, currency_code)
      VALUES (?, ?, ?, ?, ?) RETURNING id, employee_id`,
    args: ["Test Employee", "Engineering", "US", salaryMinor, currency],
  });
}

describe("employee and salary data integrity", () => {
  it("generates unique fixed employee IDs and supports pending salaries", async () => {
    const first = await addEmployee();
    const second = await addEmployee();
    expect(first.rows[0].employee_id).toBe("EMP-00001");
    expect(second.rows[0].employee_id).toBe("EMP-00002");
    expect((await client.execute("SELECT COUNT(*) AS count FROM salary_history")).rows[0].count).toBe(0);
    await expect(client.execute("UPDATE employees SET id = 42 WHERE id = 1")).rejects.toThrow();
    await expect(client.execute("UPDATE employees SET employee_id = 'EMP-42' WHERE id = 1")).rejects.toThrow();
  });

  it("enforces paired salary and currency, positive exact amounts, and known reference values", async () => {
    await expect(addEmployee(10000, null)).rejects.toThrow();
    await expect(addEmployee(null, "USD")).rejects.toThrow();
    await expect(addEmployee(0, "USD")).rejects.toThrow();
    await expect(addEmployee(-100, "USD")).rejects.toThrow();
    await expect(addEmployee(10.5, "USD")).rejects.toThrow();
    await expect(addEmployee(10000, "XXX")).rejects.toThrow();
    await expect(client.execute(`INSERT INTO employees (full_name, department, country_code)
      VALUES ('Test', 'Unknown', 'US')`)).rejects.toThrow();
    await expect(client.execute(`INSERT INTO employees (full_name, department, country_code)
      VALUES ('Test', 'Engineering', 'XX')`)).rejects.toThrow();
    await expect(client.execute(`INSERT INTO employees (full_name, department, country_code)
      VALUES ('  ', 'Engineering', 'US')`)).rejects.toThrow();
  });

  it("records first salaries and updates atomically, without history for unchanged pay or details edits", async () => {
    await addEmployee();
    await client.execute("UPDATE employees SET salary_minor = 10000000, currency_code = 'USD' WHERE id = 1");
    await client.execute("UPDATE employees SET salary_minor = 11000000 WHERE id = 1");
    await client.execute("UPDATE employees SET salary_minor = 11000000, full_name = 'Renamed Employee' WHERE id = 1");
    const history = await client.execute(`SELECT previous_salary_minor, previous_currency_code,
      new_salary_minor, new_currency_code, changed_at FROM salary_history ORDER BY id`);
    expect(history.rows).toHaveLength(2);
    expect(history.rows[0]).toMatchObject({
      previous_salary_minor: null, previous_currency_code: null,
      new_salary_minor: 10000000, new_currency_code: "USD",
    });
    expect(history.rows[1]).toMatchObject({
      previous_salary_minor: 10000000, previous_currency_code: "USD",
      new_salary_minor: 11000000, new_currency_code: "USD",
    });
    expect(history.rows[1].changed_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    await expect(client.execute("UPDATE employees SET salary_minor = NULL, currency_code = NULL WHERE id = 1")).rejects.toThrow();
  });

  it("rolls back the salary update when history cannot be saved", async () => {
    await addEmployee(10000000, "USD");
    await client.execute(`CREATE TRIGGER simulate_history_failure BEFORE INSERT ON salary_history
      BEGIN SELECT RAISE(ABORT, 'Simulated history failure'); END`);
    await expect(client.execute("UPDATE employees SET salary_minor = 12000000 WHERE id = 1")).rejects.toThrow();
    expect((await client.execute("SELECT salary_minor FROM employees WHERE id = 1")).rows[0].salary_minor).toBe(10000000);
    expect((await client.execute("SELECT COUNT(*) AS count FROM salary_history")).rows[0].count).toBe(1);
  });

  it("applies schema setup repeatedly without altering existing employee data", async () => {
    await addEmployee();
    await applySchema(client);
    expect((await client.execute("SELECT COUNT(*) AS count FROM employees")).rows[0].count).toBe(1);
    expect((await client.execute("SELECT COUNT(*) AS count FROM schema_migrations")).rows[0].count).toBe(1);
  });
});

describe("repeatable demo seed", () => {
  it("generates deterministic data and seeds 10,000 complete or pending employees without overwriting edits", async () => {
    const generated = generateDemoEmployees();
    expect(generated).toEqual(generateDemoEmployees());
    expect(generated).toHaveLength(DEMO_EMPLOYEE_COUNT);
    expect(await seedDemoEmployees(client)).toEqual({ inserted: 10000 });
    const counts = (await client.execute(`SELECT COUNT(*) AS total,
      COUNT(DISTINCT employee_id) AS ids, COUNT(salary_minor) AS salaries,
      COUNT(DISTINCT country_code) AS countries, COUNT(DISTINCT department) AS departments,
      COUNT(DISTINCT currency_code) AS currencies FROM employees`)).rows[0];
    expect(counts).toMatchObject({ total: 10000, ids: 10000, countries: 6, departments: 6, currencies: 6 });
    expect(Number(counts.salaries)).toBeGreaterThan(0);
    expect(Number(counts.salaries)).toBeLessThan(10000);
    expect((await client.execute("SELECT COUNT(*) AS count FROM salary_history")).rows[0].count).toBe(counts.salaries);
    await client.execute("UPDATE employees SET full_name = 'HR edited this employee' WHERE id = 1");
    expect(await seedDemoEmployees(client)).toEqual({ inserted: 0 });
    expect((await client.execute("SELECT full_name FROM employees WHERE id = 1")).rows[0].full_name).toBe("HR edited this employee");
    const next = await addEmployee();
    expect(next.rows[0].employee_id).toBe("EMP-10001");
  });

  it("preserves existing records when asked to seed an unmarked non-empty database", async () => {
    await addEmployee();
    await expect(seedDemoEmployees(client)).rejects.toThrow("empty employee table");
    expect((await client.execute("SELECT COUNT(*) AS count FROM employees")).rows[0].count).toBe(1);
  });

  it("rolls back an interrupted seed and can retry without partial records", async () => {
    await client.execute(`CREATE TRIGGER simulate_seed_failure BEFORE INSERT ON employees
      WHEN (SELECT COUNT(*) FROM employees) >= 150
      BEGIN SELECT RAISE(ABORT, 'Simulated seed failure'); END`);
    await expect(seedDemoEmployees(client)).rejects.toThrow();
    expect((await client.execute("SELECT COUNT(*) AS count FROM employees")).rows[0].count).toBe(0);
    expect((await client.execute("SELECT COUNT(*) AS count FROM salary_history")).rows[0].count).toBe(0);
    expect((await client.execute("SELECT COUNT(*) AS count FROM seed_runs")).rows[0].count).toBe(0);
    await client.execute("DROP TRIGGER simulate_seed_failure");
    expect(await seedDemoEmployees(client)).toEqual({ inserted: 10000 });
  });
});

it("requires hosted database configuration in production", () => {
  expect(() => createDatabaseClient({ NODE_ENV: "production" })).toThrow("persistent hosted database");
  expect(() => createDatabaseClient({ NODE_ENV: "test", DATABASE_URL: "libsql://demo.example" })).toThrow("DATABASE_AUTH_TOKEN");
});
