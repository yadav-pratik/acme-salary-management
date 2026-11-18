import { describe, expect, it } from "vitest";
import { formatSalary, parseSalaryMinor, salaryInputValue } from "./money";

describe("salary amounts", () => {
  it("parses decimal strings exactly according to currency precision", () => {
    expect(parseSalaryMinor("120000.29", 2)).toBe(12000029);
    expect(parseSalaryMinor("0.01", 2)).toBe(1);
    expect(parseSalaryMinor("8500000", 0)).toBe(8500000);
    expect(parseSalaryMinor("90071992547409.91", 2)).toBe(Number.MAX_SAFE_INTEGER);
  });

  it("rejects non-positive, unsafe, ambiguous or over-precise amounts", () => {
    for (const value of ["", "0", "-1", "1e5", "1,000", "12.345", "NaN", "90071992547409.92"]) {
      expect(parseSalaryMinor(value, 2)).toBeNull();
    }
    expect(parseSalaryMinor("100.5", 0)).toBeNull();
  });

  it("formats whole-unit and decimal currencies without rounding away a minor unit", () => {
    expect(formatSalary(12000029, "USD", 2)).toBe("USD 120,000.29");
    expect(formatSalary(8500000, "JPY", 0)).toBe("JPY 8,500,000");
    expect(formatSalary(Number.MAX_SAFE_INTEGER, "EUR", 2)).toBe("EUR 90,071,992,547,409.91");
  });
});

it("prefills salary inputs without grouping or losing decimal precision", () => {
  expect(salaryInputValue(12000029, 2)).toBe("120000.29");
  expect(salaryInputValue(8500000, 0)).toBe("8500000");
  expect(parseSalaryMinor(salaryInputValue(Number.MAX_SAFE_INTEGER, 2), 2)).toBe(Number.MAX_SAFE_INTEGER);
});
