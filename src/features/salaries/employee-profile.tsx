"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { EmployeeForm } from "@/features/employees/employee-form";
import type { EmployeeOptions } from "@/features/employees/types";
import { formatSalary } from "@/lib/money";
import { SalaryForm } from "./salary-form";
import type { EmployeeProfileData } from "./types";

export function EmployeeProfile({ data, options }: { data: EmployeeProfileData; options: EmployeeOptions }) {
  const { employee } = data;
  const [openForm, setOpenForm] = useState<"details" | "salary" | null>(null);
  const [notice, setNotice] = useState("");

  function saved(message: string) {
    setNotice(message);
    setOpenForm(null);
  }

  function open(form: "details" | "salary") {
    setNotice("");
    setOpenForm(form);
  }

  return (
    <>
      <Link className="back-link" href="/employees">← Back to employees</Link>
      <div className="page-heading profile-heading">
        <div>
          <h1>{employee.fullName}</h1>
          <p className="muted">{employee.employeeId}</p>
        </div>
        <Button variant="quiet" onClick={() => open("details")}>Edit details</Button>
      </div>
      {notice && <p className="success-message" role="status">{notice}</p>}
      <dl className="employee-details">
        <div><dt>Department</dt><dd>{employee.department}</dd></div>
        <div><dt>Work country</dt><dd>{employee.countryName}</dd></div>
      </dl>
      <section className="salary-card" aria-labelledby="current-salary-heading">
        <div>
          <h2 id="current-salary-heading">Current annual gross base salary</h2>
          <p className={employee.salaryMinor === null ? "salary-pending-value" : "salary-value"}>
            {employee.salaryMinor === null
              ? "Salary pending"
              : formatSalary(employee.salaryMinor, employee.currencyCode!, employee.minorUnits!)}
          </p>
        </div>
        <Button onClick={() => open("salary")}>{employee.salaryMinor === null ? "Add salary" : "Update salary"}</Button>
      </section>
      <section className="salary-history" aria-labelledby="salary-history-heading">
        <h2 id="salary-history-heading">Salary history</h2>
        {data.history.length ? (
          <div className="table-container" role="region" aria-label="Salary history" tabIndex={0}>
            <table className="employee-table history-table">
              <caption className="sr-only">Annual gross base salary changes</caption>
              <thead><tr><th scope="col">Date and time (UTC)</th><th scope="col">Previous amount</th><th scope="col">New amount</th></tr></thead>
              <tbody>
                {data.history.map(entry => (
                  <tr key={entry.id}>
                    <td><time dateTime={entry.changedAt}>{entry.changedAt.replace("T", " ").slice(0, 19)}</time></td>
                    <td>{entry.previousSalaryMinor === null
                      ? "—"
                      : formatSalary(entry.previousSalaryMinor, entry.previousCurrencyCode!, entry.previousMinorUnits!)}</td>
                    <td>{formatSalary(entry.newSalaryMinor, entry.newCurrencyCode, entry.newMinorUnits)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <div className="empty-state"><p>No salary history yet.</p></div>}
        {data.pageCount > 1 && (
          <nav className="pagination" aria-label="Salary history pages">
            <span>Page {data.page} of {data.pageCount} · {data.historyTotal} changes</span>
            <div>
              {data.page > 1
                ? <Link className="button button--quiet" href={`/employees/${employee.employeeId}?page=${data.page - 1}`}>Previous</Link>
                : <Button variant="quiet" disabled>Previous</Button>}
              {data.page < data.pageCount
                ? <Link className="button button--quiet" href={`/employees/${employee.employeeId}?page=${data.page + 1}`}>Next</Link>
                : <Button variant="quiet" disabled>Next</Button>}
            </div>
          </nav>
        )}
      </section>
      {openForm === "details" && <EmployeeForm employee={employee} options={options} onClose={() => setOpenForm(null)} onSaved={saved} />}
      {openForm === "salary" && <SalaryForm employee={employee} revision={data.revision} currencies={options.currencies} onClose={() => setOpenForm(null)} onSaved={saved} />}
    </>
  );
}
