import type { Client } from "@libsql/client";
import { getEmployee } from "../employees/repository";
import type { EmployeeProfileData } from "./types";

export async function getEmployeeProfile(client: Client, employeeId: string, requestedPage = 1): Promise<EmployeeProfileData | null> {
  const transaction = await client.transaction("read");
  try {
    const employee = await getEmployee(transaction, employeeId);
    if (!employee) return null;
    const counts = (await transaction.execute({
      sql: "SELECT COUNT(*) AS total, COALESCE(MAX(id), 0) AS revision FROM salary_history WHERE employee_id = ?",
      args: [employee.id],
    })).rows[0];
    const historyTotal = Number(counts.total);
    const pageCount = Math.max(1, Math.ceil(historyTotal / 20));
    const page = Math.min(requestedPage, pageCount);
    const history = await transaction.execute({
      sql: `SELECT h.*, old.minor_units AS previous_minor_units, current.minor_units AS new_minor_units
        FROM salary_history h
        LEFT JOIN currencies old ON old.code = h.previous_currency_code
        JOIN currencies current ON current.code = h.new_currency_code
        WHERE h.employee_id = ? ORDER BY h.id DESC LIMIT 20 OFFSET ?`,
      args: [employee.id, (page - 1) * 20],
    });
    return {
      employee, revision: Number(counts.revision), historyTotal, page, pageCount,
      history: history.rows.map(row => ({
        id: Number(row.id),
        previousSalaryMinor: row.previous_salary_minor === null ? null : Number(row.previous_salary_minor),
        previousCurrencyCode: row.previous_currency_code === null ? null : String(row.previous_currency_code),
        previousMinorUnits: row.previous_minor_units === null ? null : Number(row.previous_minor_units),
        newSalaryMinor: Number(row.new_salary_minor),
        newCurrencyCode: String(row.new_currency_code),
        newMinorUnits: Number(row.new_minor_units),
        changedAt: String(row.changed_at),
      })),
    };
  } finally {
    transaction.close();
  }
}

export async function updateSalary(
  client: Client, id: number, salaryMinor: number, currencyCode: string, expectedRevision: number,
) {
  const transaction = await client.transaction("write");
  try {
    const result = await transaction.execute({
      sql: `SELECT employee_id, salary_minor, currency_code,
        (SELECT COALESCE(MAX(id), 0) FROM salary_history WHERE employee_id = employees.id) AS revision
        FROM employees WHERE id = ?`,
      args: [id],
    });
    if (!result.rows.length) return { status: "missing" as const, employeeId: "" };
    const employee = result.rows[0];
    const employeeId = String(employee.employee_id);
    if (employee.salary_minor === salaryMinor && employee.currency_code === currencyCode) {
      return { status: "unchanged" as const, employeeId };
    }
    if (Number(employee.revision) !== expectedRevision) {
      return { status: "conflict" as const, employeeId };
    }
    await transaction.execute({
      sql: `UPDATE employees SET salary_minor = ?, currency_code = ?,
        updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?`,
      args: [salaryMinor, currencyCode, id],
    });
    await transaction.commit();
    return { status: "updated" as const, employeeId };
  } finally {
    transaction.close();
  }
}
