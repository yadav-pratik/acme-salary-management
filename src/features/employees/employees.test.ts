import { createClient, type Client } from "@libsql/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { applySchema } from "../../lib/db/schema";
import { createEmployee, getEmployeeOptions, listEmployees, updateEmployeeDetails } from "./repository";
import { readEmployeeValues, readListFilters, validateEmployee } from "./validation";
import type { EmployeeOptions, EmployeeValues } from "./types";

let client: Client;
let options: EmployeeOptions;
const baseValues: EmployeeValues = {
  fullName: "Alex Sample",
  department: "Engineering",
  countryCode: "US",
  salary: "",
  currencyCode: "",
};

beforeEach(async () => {
  client = createClient({ url: "file::memory:" });
  await applySchema(client);
  options = await getEmployeeOptions(client);
});

afterEach(() => client.close());

describe("employee input validation", () => {
  it("supports a pending salary and validates the currency's precision", () => {
    expect(validateEmployee(baseValues, options, true)).toEqual({ errors: {}, salaryMinor: null });
    expect(validateEmployee({ ...baseValues, salary: "120000.29", currencyCode: "USD" }, options, true))
      .toEqual({ errors: {}, salaryMinor: 12000029 });
    expect(validateEmployee({ ...baseValues, salary: "1.50", currencyCode: "JPY" }, options, true).errors.salary).toBeTruthy();
  });

  it("rejects missing or invalid details and incomplete salary pairs", () => {
    expect(validateEmployee({ ...baseValues, fullName: "", department: "Unknown", countryCode: "XX" }, options, true).errors)
      .toHaveProperty("fullName");
    expect(validateEmployee({ ...baseValues, salary: "100" }, options, true).errors.currencyCode).toBeTruthy();
    expect(validateEmployee({ ...baseValues, currencyCode: "EUR" }, options, true).errors.salary).toBeTruthy();
    expect(validateEmployee({ ...baseValues, salary: "-10", currencyCode: "USD" }, options, true).errors.salary).toBeTruthy();
  });

  it("ignores compensation input when editing details and trims submitted values", () => {
    expect(validateEmployee({ ...baseValues, salary: "invalid", currencyCode: "XXX" }, options, false))
      .toEqual({ errors: {}, salaryMinor: null });
    const form = new FormData();
    form.set("fullName", "  Alex Sample  ");
    form.set("department", "Engineering");
    form.set("countryCode", "US");
    expect(readEmployeeValues(form)).toEqual(baseValues);
  });

  it("normalizes untrusted pagination and repeated query parameters", () => {
    expect(readListFilters({ q: ["a", "b"], page: "Infinity" })).toEqual({
      query: "", department: "", country: "", page: 1,
    });
    expect(readListFilters({ q: " Alex ", page: "-2" }).query).toBe("Alex");
    expect(readListFilters({ page: "-2" }).page).toBe(1);
    expect(readListFilters({ page: "2" }).page).toBe(2);
  });
});

describe("employee persistence and browsing", () => {
  it("creates an employee with history and returns the same employee for a retried form", async () => {
    const values = { ...baseValues, salary: "120000", currencyCode: "USD" };
    const token = crypto.randomUUID();
    const id = await createEmployee(client, values, 12000000, token);
    expect(await createEmployee(client, values, 12000000, token)).toBe(id);
    expect((await client.execute("SELECT COUNT(*) AS count FROM employees")).rows[0].count).toBe(1);
    expect((await client.execute("SELECT COUNT(*) AS count FROM salary_history")).rows[0].count).toBe(1);
  });

  it("edits only employee details, preserving salary and history", async () => {
    await createEmployee(client, { ...baseValues, currencyCode: "USD" }, 10000000, crypto.randomUUID());
    await updateEmployeeDetails(client, 1, {
      ...baseValues, fullName: "Alex Updated", department: "Sales", countryCode: "CA",
      salary: "1", currencyCode: "JPY",
    });
    const record = (await client.execute("SELECT * FROM employees WHERE id = 1")).rows[0];
    expect(record).toMatchObject({
      employee_id: "EMP-00001", full_name: "Alex Updated", department: "Sales",
      country_code: "CA", salary_minor: 10000000, currency_code: "USD",
    });
    expect((await client.execute("SELECT COUNT(*) AS count FROM salary_history")).rows[0].count).toBe(1);
    await expect(updateEmployeeDetails(client, 999, baseValues)).rejects.toThrow("no longer exists");
  });

  it("filters combined criteria and treats wildcard and SQL characters as literal search text", async () => {
    await createEmployee(client, { ...baseValues, fullName: "Alex 100%_Test" }, null, crypto.randomUUID());
    await createEmployee(client, { ...baseValues, fullName: "Alex Other", countryCode: "CA" }, null, crypto.randomUUID());
    const filtered = await listEmployees(client, { query: "100%_", department: "Engineering", country: "US", page: 1 });
    expect(filtered.total).toBe(1);
    expect(filtered.employees[0].fullName).toBe("Alex 100%_Test");
    expect((await listEmployees(client, { query: "' OR 1=1 --", department: "", country: "", page: 1 })).total).toBe(0);
    expect((await listEmployees(client, { query: "EMP-00002", department: "", country: "", page: 1 })).employees[0].countryCode).toBe("CA");
  });

  it("paginates a stable result set and clamps pages after filters reduce the results", async () => {
    await client.batch(Array.from({ length: 27 }, (_, index) => ({
      sql: "INSERT INTO employees (full_name, department, country_code) VALUES (?, ?, ?)",
      args: [`Employee ${index + 1}`, "Engineering", "US"],
    })), "write");
    const first = await listEmployees(client, { query: "", department: "", country: "", page: 1 });
    const last = await listEmployees(client, { query: "", department: "", country: "", page: 999 });
    expect(first.employees).toHaveLength(25);
    expect(first.total).toBe(27);
    expect(last.page).toBe(2);
    expect(last.employees.map(employee => employee.employeeId)).toEqual(["EMP-00026", "EMP-00027"]);
    const empty = await listEmployees(client, { query: "", department: "", country: "DE", page: 999 });
    expect(empty).toMatchObject({ total: 0, page: 1, pageCount: 1, employees: [] });
  });

  it("upgrades a version-one database while preserving employee records and history", async () => {
    await createEmployee(client, { ...baseValues, currencyCode: "EUR" }, 9000000, crypto.randomUUID());
    await client.batch([
      "DROP INDEX employees_creation_token",
      "ALTER TABLE employees DROP COLUMN creation_token",
      "DELETE FROM schema_migrations WHERE version = 2",
    ], "write");
    await applySchema(client);
    expect((await client.execute("SELECT COUNT(*) AS count FROM schema_migrations")).rows[0].count).toBe(2);
    expect((await client.execute("SELECT employee_id, salary_minor FROM employees")).rows[0])
      .toMatchObject({ employee_id: "EMP-00001", salary_minor: 9000000 });
    expect((await client.execute("SELECT COUNT(*) AS count FROM salary_history")).rows[0].count).toBe(1);
  });
});
