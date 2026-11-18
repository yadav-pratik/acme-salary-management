import type { Client } from "@libsql/client";
import type { EmployeeOptions, EmployeePage, EmployeeValues, ListFilters } from "./types";

export async function getEmployeeOptions(client: Client): Promise<EmployeeOptions> {
  const [departments, countries, currencies] = await client.batch([
    "SELECT name FROM departments ORDER BY name",
    "SELECT code, name FROM countries ORDER BY name",
    "SELECT code, minor_units FROM currencies ORDER BY code",
  ], "read");
  return {
    departments: departments.rows.map(row => String(row.name)),
    countries: countries.rows.map(row => ({ code: String(row.code), name: String(row.name) })),
    currencies: currencies.rows.map(row => ({ code: String(row.code), minorUnits: Number(row.minor_units) })),
  };
}

export async function listEmployees(client: Client, filters: ListFilters): Promise<EmployeePage> {
  const conditions: string[] = [];
  const args: string[] = [];
  if (filters.query) {
    const literal = filters.query.replace(/[\\%_]/g, "\\$&");
    conditions.push("(e.full_name LIKE ? ESCAPE '\\' OR e.employee_id LIKE ? ESCAPE '\\')");
    args.push(`%${literal}%`, `%${literal}%`);
  }
  if (filters.department) {
    conditions.push("e.department = ?");
    args.push(filters.department);
  }
  if (filters.country) {
    conditions.push("e.country_code = ?");
    args.push(filters.country);
  }

  const where = conditions.length ? "WHERE " + conditions.join(" AND ") : "";
  const transaction = await client.transaction("read");
  try {
    const count = await transaction.execute({
      sql: `SELECT COUNT(*) AS total FROM employees e ${where}`, args,
    });
    const total = Number(count.rows[0].total);
    const pageSize = 25;
    const pageCount = Math.max(1, Math.ceil(total / pageSize));
    const page = Math.min(filters.page, pageCount);
    const result = await transaction.execute({
      sql: `SELECT e.*, c.name AS country_name, m.minor_units
        FROM employees e
        JOIN countries c ON c.code = e.country_code
        LEFT JOIN currencies m ON m.code = e.currency_code
        ${where} ORDER BY e.id LIMIT ? OFFSET ?`,
      args: [...args, pageSize, (page - 1) * pageSize],
    });
    return {
      total, page, pageCount, pageSize,
      employees: result.rows.map(row => ({
        id: Number(row.id),
        employeeId: String(row.employee_id),
        fullName: String(row.full_name),
        department: String(row.department),
        countryCode: String(row.country_code),
        countryName: String(row.country_name),
        salaryMinor: row.salary_minor === null ? null : Number(row.salary_minor),
        currencyCode: row.currency_code === null ? null : String(row.currency_code),
        minorUnits: row.minor_units === null ? null : Number(row.minor_units),
      })),
    };
  } finally {
    transaction.close();
  }
}

export async function createEmployee(
  client: Client, values: EmployeeValues, salaryMinor: number | null, creationToken: string,
) {
  const result = await client.execute({
    sql: `INSERT INTO employees (
      full_name, department, country_code, salary_minor, currency_code, creation_token
    ) VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(creation_token) DO UPDATE SET creation_token = excluded.creation_token
    RETURNING employee_id`,
    args: [
      values.fullName, values.department, values.countryCode,
      salaryMinor, salaryMinor === null ? null : values.currencyCode, creationToken,
    ],
  });
  return String(result.rows[0].employee_id);
}

export async function updateEmployeeDetails(client: Client, id: number, values: EmployeeValues) {
  const result = await client.execute({
    sql: `UPDATE employees SET full_name = ?, department = ?, country_code = ?,
      updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ? RETURNING employee_id`,
    args: [values.fullName, values.department, values.countryCode, id],
  });
  if (!result.rows.length) throw new Error("Employee record no longer exists.");
  return String(result.rows[0].employee_id);
}
