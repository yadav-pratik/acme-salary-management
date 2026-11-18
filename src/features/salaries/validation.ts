import { parseSalaryMinor } from "../../lib/money";

export function validateSalary(
  salary: string, currencyCode: string, currencies: { code: string; minorUnits: number }[],
) {
  const errors: { salary?: string; currencyCode?: string } = {};
  const currency = currencies.find(item => item.code === currencyCode);
  let salaryMinor: number | null = null;
  if (!currency) errors.currencyCode = "Select a currency.";
  if (!salary.trim()) {
    errors.salary = "Enter an annual gross base salary.";
  } else if (currency) {
    salaryMinor = parseSalaryMinor(salary, currency.minorUnits);
    if (salaryMinor === null) errors.salary = `Enter a positive amount with at most ${currency.minorUnits} decimal places.`;
  }
  return { errors, salaryMinor };
}
