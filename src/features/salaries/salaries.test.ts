import { createClient, type Client } from "@libsql/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { applySchema } from "../../lib/db/schema";
import { getEmployeeProfile, updateSalary } from "./repository";
import { validateSalary } from "./validation";

let client: Client;

beforeEach(async () => {
  client = createClient({ url: "file::memory:" });
  await applySchema(client);
  await client.execute(`INSERT INTO employees (full_name, department, country_code)
    VALUES ('Profile Test', 'Engineering', 'US')`);
});
afterEach(() => client.close());

const currencies = [{ code: "USD", minorUnits: 2 }, { code: "JPY", minorUnits: 0 }];

describe("salary input", () => {
  it("requires a positive amount and known currency with supported precision", () => {
    expect(validateSalary("120000.29", "USD", currencies)).toEqual({ errors: {}, salaryMinor: 12000029 });
    expect(validateSalary("8500000", "JPY", currencies)).toEqual({ errors: {}, salaryMinor: 8500000 });
    expect(validateSalary("", "", currencies).errors).toHaveProperty("salary");
    expect(validateSalary("100", "XXX", currencies).errors).toHaveProperty("currencyCode");
    expect(validateSalary("-1", "USD", currencies).errors).toHaveProperty("salary");
    expect(validateSalary("10.25", "JPY", currencies).errors).toHaveProperty("salary");
  });
});

describe("employee profile and salary history", () => {
  it("loads a pending employee with empty history and handles missing employees", async () => {
    const profile = await getEmployeeProfile(client, "EMP-00001");
    expect(profile).toMatchObject({
      employee: { fullName: "Profile Test", salaryMinor: null, currencyCode: null },
      history: [], historyTotal: 0, revision: 0, page: 1, pageCount: 1,
    });
    expect(await getEmployeeProfile(client, "EMP-99999")).toBeNull();
    expect(await getEmployeeProfile(client, "' OR 1=1 --")).toBeNull();
  });

  it("records the initial salary and later currency changes with exact previous/new amounts", async () => {
    expect(await updateSalary(client, 1, 12000029, "USD", 0)).toMatchObject({ status: "updated" });
    const first = (await getEmployeeProfile(client, "EMP-00001"))!;
    expect(first.history[0]).toMatchObject({
      previousSalaryMinor: null, previousCurrencyCode: null,
      newSalaryMinor: 12000029, newCurrencyCode: "USD", newMinorUnits: 2,
    });
    expect(first.history[0].changedAt).toMatch(/^\d{4}-\d{2}-\d{2}T.*Z$/);
    await updateSalary(client, 1, 8500000, "JPY", first.revision);
    const changed = (await getEmployeeProfile(client, "EMP-00001"))!;
    expect(changed.employee).toMatchObject({ salaryMinor: 8500000, currencyCode: "JPY" });
    expect(changed.history[0]).toMatchObject({
      previousSalaryMinor: 12000029, previousCurrencyCode: "USD", previousMinorUnits: 2,
      newSalaryMinor: 8500000, newCurrencyCode: "JPY", newMinorUnits: 0,
    });
    expect(changed.historyTotal).toBe(2);
  });

  it("does not create duplicate history for an unchanged salary or retried successful request", async () => {
    await updateSalary(client, 1, 10000000, "USD", 0);
    expect(await updateSalary(client, 1, 10000000, "USD", 0)).toMatchObject({ status: "unchanged" });
    const profile = (await getEmployeeProfile(client, "EMP-00001"))!;
    expect(profile.historyTotal).toBe(1);
  });

  it("preserves a newer salary when another HR form has an older revision", async () => {
    await updateSalary(client, 1, 10000000, "USD", 0);
    expect(await updateSalary(client, 1, 13000000, "USD", 0)).toMatchObject({ status: "conflict" });
    const profile = (await getEmployeeProfile(client, "EMP-00001"))!;
    expect(profile.employee.salaryMinor).toBe(10000000);
    expect(profile.historyTotal).toBe(1);
  });

  it("detects a stale form even if salary has changed back to its earlier amount", async () => {
    await updateSalary(client, 1, 10000000, "USD", 0);
    const earlier = (await getEmployeeProfile(client, "EMP-00001"))!;
    await updateSalary(client, 1, 11000000, "USD", earlier.revision);
    const later = (await getEmployeeProfile(client, "EMP-00001"))!;
    await updateSalary(client, 1, 10000000, "USD", later.revision);
    expect(await updateSalary(client, 1, 12000000, "USD", earlier.revision)).toMatchObject({ status: "conflict" });
    expect((await getEmployeeProfile(client, "EMP-00001"))!.historyTotal).toBe(3);
  });

  it("rolls back the salary update if history fails and allows a safe retry", async () => {
    await client.execute(`CREATE TRIGGER simulate_salary_failure BEFORE INSERT ON salary_history
      BEGIN SELECT RAISE(ABORT, 'Simulated history failure'); END`);
    await expect(updateSalary(client, 1, 10000000, "USD", 0)).rejects.toThrow();
    expect((await getEmployeeProfile(client, "EMP-00001"))!.employee.salaryMinor).toBeNull();
    await client.execute("DROP TRIGGER simulate_salary_failure");
    expect(await updateSalary(client, 1, 10000000, "USD", 0)).toMatchObject({ status: "updated" });
    expect((await getEmployeeProfile(client, "EMP-00001"))!.historyTotal).toBe(1);
  });

  it("paginates history newest first and clamps an out-of-range page", async () => {
    let revision = 0;
    for (let index = 1; index <= 22; index++) {
      await updateSalary(client, 1, index * 100000, "USD", revision);
      revision = (await getEmployeeProfile(client, "EMP-00001"))!.revision;
    }
    const first = (await getEmployeeProfile(client, "EMP-00001"))!;
    const last = (await getEmployeeProfile(client, "EMP-00001", 999))!;
    expect(first.history).toHaveLength(20);
    expect(first.history[0].newSalaryMinor).toBe(2200000);
    expect(last).toMatchObject({ page: 2, pageCount: 2, historyTotal: 22 });
    expect(last.history.map(entry => entry.newSalaryMinor)).toEqual([200000, 100000]);
  });

  it("reports a missing record without modifying any salary", async () => {
    expect(await updateSalary(client, 999, 10000000, "USD", 0)).toMatchObject({ status: "missing" });
    expect((await getEmployeeProfile(client, "EMP-00001"))!.historyTotal).toBe(0);
  });
});
