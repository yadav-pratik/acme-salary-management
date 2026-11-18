import { parseSalaryMinor } from "../../lib/money";
import type { EmployeeErrors, EmployeeOptions, EmployeeValues, ListFilters } from "./types";

export function readEmployeeValues(form: FormData): EmployeeValues {
  function text(key: string) {
    const value = form.get(key);
    return typeof value === "string" ? value.trim() : "";
  }
  return {
    fullName: text("fullName"),
    department: text("department"),
    countryCode: text("countryCode"),
    salary: text("salary"),
    currencyCode: text("currencyCode"),
  };
}

export function validateEmployee(values: EmployeeValues, options: EmployeeOptions, creating: boolean) {
  const errors: EmployeeErrors = {};
  if (!values.fullName || values.fullName.length > 120) {
    errors.fullName = "Enter a full name of up to 120 characters.";
  }
  if (!options.departments.includes(values.department)) errors.department = "Select a department.";
  if (!options.countries.some(country => country.code === values.countryCode)) {
    errors.countryCode = "Select a work country.";
  }

  let salaryMinor: number | null = null;
  if (creating && (values.salary || values.currencyCode)) {
    const currency = options.currencies.find(item => item.code === values.currencyCode);
    if (!currency) errors.currencyCode = "Select a currency.";
    if (!values.salary) {
      errors.salary = "Enter a salary or leave both salary and currency blank.";
    } else if (currency) {
      salaryMinor = parseSalaryMinor(values.salary, currency.minorUnits);
      if (salaryMinor === null) {
        errors.salary = `Enter a positive amount with at most ${currency.minorUnits} decimal places.`;
      }
    }
  }
  return { errors, salaryMinor };
}

export function readListFilters(params: Record<string, string | string[] | undefined>): ListFilters {
  function text(key: string) {
    const value = params[key];
    return typeof value === "string" ? value.trim().slice(0, 200) : "";
  }
  const page = Number(text("page"));
  return {
    query: text("q"),
    department: text("department"),
    country: text("country"),
    page: Number.isSafeInteger(page) && page > 0 ? page : 1,
  };
}
