export const currencies = [
  { code: "USD", minorUnits: 2 },
  { code: "EUR", minorUnits: 2 },
  { code: "GBP", minorUnits: 2 },
  { code: "INR", minorUnits: 2 },
  { code: "JPY", minorUnits: 0 },
  { code: "CAD", minorUnits: 2 },
] as const;

export const countries = [
  { code: "US", name: "United States", currency: "USD", minSalary: 50000, maxSalary: 220000 },
  { code: "DE", name: "Germany", currency: "EUR", minSalary: 45000, maxSalary: 180000 },
  { code: "GB", name: "United Kingdom", currency: "GBP", minSalary: 40000, maxSalary: 170000 },
  { code: "IN", name: "India", currency: "INR", minSalary: 600000, maxSalary: 6000000 },
  { code: "JP", name: "Japan", currency: "JPY", minSalary: 4000000, maxSalary: 18000000 },
  { code: "CA", name: "Canada", currency: "CAD", minSalary: 60000, maxSalary: 230000 },
] as const;

export const departments = [
  "Engineering", "Product", "Sales", "Finance", "People", "Operations",
] as const;
