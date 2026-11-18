export type Employee = {
  id: number;
  employeeId: string;
  fullName: string;
  department: string;
  countryCode: string;
  countryName: string;
  salaryMinor: number | null;
  currencyCode: string | null;
  minorUnits: number | null;
};

export type EmployeeOptions = {
  departments: string[];
  countries: { code: string; name: string }[];
  currencies: { code: string; minorUnits: number }[];
};

export type EmployeeValues = {
  fullName: string;
  department: string;
  countryCode: string;
  salary: string;
  currencyCode: string;
};

export type EmployeeErrors = Partial<Record<keyof EmployeeValues, string>>;

export type ListFilters = {
  query: string;
  department: string;
  country: string;
  page: number;
};

export type EmployeePage = {
  employees: Employee[];
  total: number;
  page: number;
  pageCount: number;
  pageSize: number;
};

export type EmployeeFormState = {
  errors: EmployeeErrors;
  message: string;
  success: boolean;
};
