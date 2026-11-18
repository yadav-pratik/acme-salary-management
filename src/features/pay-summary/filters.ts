import type { EmployeeOptions } from "../employees/types";
import type { PaySummaryFilters } from "./types";

export function readSummaryFilters(
  params: Record<string, string | string[] | undefined>, options: EmployeeOptions,
) {
  function text(key: string) {
    return typeof params[key] === "string" ? params[key].trim().slice(0, 200) : "";
  }
  const requestedCurrency = params.currency === undefined
    ? options.currencies.find(item => item.code === "USD")?.code ?? options.currencies[0]?.code ?? ""
    : text("currency");
  const requestedDepartment = text("department");
  const requestedCountry = text("country");
  const errors: { currency?: string; department?: string; country?: string } = {};
  const filters: PaySummaryFilters = { currency: "", department: "", country: "" };

  if (options.currencies.some(item => item.code === requestedCurrency)) {
    filters.currency = requestedCurrency;
  } else {
    errors.currency = "Select an available currency.";
  }
  if (!requestedDepartment || options.departments.includes(requestedDepartment)) {
    filters.department = requestedDepartment;
  } else {
    errors.department = "Select an available department.";
  }
  if (!requestedCountry || options.countries.some(item => item.code === requestedCountry)) {
    filters.country = requestedCountry;
  } else {
    errors.country = "Select an available work country.";
  }
  return { filters, errors };
}
