import { createClient, type Client } from "@libsql/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { applySchema } from "../../lib/db/schema";
import { getEmployeeOptions } from "../employees/repository";
import { readSummaryFilters } from "./filters";
import { getPaySummary } from "./repository";

let client: Client;

beforeEach(async () => {
  client = createClient({ url: "file::memory:" });
  await applySchema(client);
});
afterEach(() => client.close());

async function add(salary: number | null, currency: string | null, department = "Engineering", country = "US") {
  return client.execute({
    sql: `INSERT INTO employees (full_name, department, country_code, salary_minor, currency_code)
      VALUES ('Summary Test', ?, ?, ?, ?)`,
    args: [department, country, salary, currency],
  });
}

const usd = { currency: "USD", department: "", country: "" };

describe("pay summary calculations", () => {
  it("returns empty metrics and zero counts for an empty database", async () => {
    expect(await getPaySummary(client, usd)).toEqual({
      includedCount: 0, pendingCount: 0,
      medianMinor: null, lowestMinor: null, highestMinor: null, medianRounded: false,
    });
  });

  it("handles a single salary and an odd number of unsorted salaries", async () => {
    await add(30000, "USD");
    expect(await getPaySummary(client, usd)).toMatchObject({ includedCount: 1, medianMinor: 30000 });
    await add(10000, "USD");
    await add(20000, "USD");
    expect(await getPaySummary(client, usd)).toMatchObject({
      includedCount: 3, medianMinor: 20000, lowestMinor: 10000, highestMinor: 30000, medianRounded: false,
    });
  });

  it("averages the middle salaries for even counts and rounds a half minor unit up", async () => {
    await add(100, "USD");
    await add(101, "USD");
    expect(await getPaySummary(client, usd)).toMatchObject({
      includedCount: 2, medianMinor: 101, medianRounded: true,
    });
    await add(200, "USD");
    await add(300, "USD");
    expect(await getPaySummary(client, usd)).toMatchObject({
      includedCount: 4, medianMinor: 151, medianRounded: true,
    });
  });

  it("keeps very large integer salaries exact while calculating the median", async () => {
    await add(Number.MAX_SAFE_INTEGER, "USD");
    await add(Number.MAX_SAFE_INTEGER - 1, "USD");
    expect(await getPaySummary(client, usd)).toMatchObject({
      medianMinor: Number.MAX_SAFE_INTEGER, medianRounded: true,
      lowestMinor: Number.MAX_SAFE_INTEGER - 1, highestMinor: Number.MAX_SAFE_INTEGER,
    });
  });

  it("excludes other currencies and scopes pending counts by country and department", async () => {
    await add(10000, "USD");
    await add(90000, "EUR");
    await add(20000, "USD", "Sales", "CA");
    await add(null, null);
    await add(null, null);
    await add(null, null, "Sales", "US");
    await add(null, null, "Engineering", "CA");
    const filtered = { currency: "USD", department: "Engineering", country: "US" };
    expect(await getPaySummary(client, filtered)).toMatchObject({
      includedCount: 1, medianMinor: 10000, lowestMinor: 10000, highestMinor: 10000, pendingCount: 2,
    });
    expect(await getPaySummary(client, { ...filtered, currency: "EUR" })).toMatchObject({
      includedCount: 1, medianMinor: 90000, pendingCount: 2,
    });
  });

  it("shows pending counts even when no salaries match the selected currency", async () => {
    await add(null, null);
    await add(null, null);
    await add(50000, "EUR");
    expect(await getPaySummary(client, usd)).toMatchObject({
      includedCount: 0, pendingCount: 2, medianMinor: null, lowestMinor: null, highestMinor: null,
    });
  });

  it("reads current salaries without counting history entries as additional employees", async () => {
    await add(10000, "USD");
    await client.execute("UPDATE employees SET salary_minor = 20000 WHERE id = 1");
    expect(await getPaySummary(client, usd)).toMatchObject({
      includedCount: 1, medianMinor: 20000, lowestMinor: 20000, highestMinor: 20000,
    });
  });

  it("treats filter text as data and returns an empty scope for an unknown department", async () => {
    await add(10000, "USD");
    await add(null, null);
    expect(await getPaySummary(client, { ...usd, department: "' OR 1=1 --" })).toMatchObject({
      includedCount: 0, pendingCount: 0,
    });
  });

  it("uses whole-unit precision for JPY salaries and handles duplicate amounts", async () => {
    await add(8000000, "JPY", "Engineering", "JP");
    await add(8000000, "JPY", "Engineering", "JP");
    expect(await getPaySummary(client, { ...usd, currency: "JPY" })).toMatchObject({
      medianMinor: 8000000, lowestMinor: 8000000, highestMinor: 8000000, medianRounded: false,
    });
  });
});

describe("pay summary filter validation", () => {
  it("defaults to USD and retains valid explicit selections", async () => {
    const options = await getEmployeeOptions(client);
    expect(readSummaryFilters({}, options)).toEqual({ filters: usd, errors: {} });
    expect(readSummaryFilters({ currency: " JPY ", department: "Engineering", country: "JP" }, options)).toEqual({
      filters: { currency: "JPY", department: "Engineering", country: "JP" }, errors: {},
    });
  });

  it("reports unavailable filters without displaying statistics for a different scope", async () => {
    const options = await getEmployeeOptions(client);
    const result = readSummaryFilters({ currency: "XXX", department: "Unknown", country: "XX" }, options);
    expect(result.filters).toEqual({ currency: "", department: "", country: "" });
    expect(Object.keys(result.errors)).toEqual(["currency", "department", "country"]);
    expect(readSummaryFilters({ currency: ["USD", "EUR"] }, options).errors.currency).toBeTruthy();
  });
});
