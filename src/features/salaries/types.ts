import type { Employee } from "../employees/types";

export type SalaryHistoryEntry = {
  id: number;
  previousSalaryMinor: number | null;
  previousCurrencyCode: string | null;
  previousMinorUnits: number | null;
  newSalaryMinor: number;
  newCurrencyCode: string;
  newMinorUnits: number;
  changedAt: string;
};

export type EmployeeProfileData = {
  employee: Employee;
  history: SalaryHistoryEntry[];
  revision: number;
  historyTotal: number;
  page: number;
  pageCount: number;
};

export type SalaryFormState = {
  errors: { salary?: string; currencyCode?: string };
  message: string;
  success: boolean;
};
