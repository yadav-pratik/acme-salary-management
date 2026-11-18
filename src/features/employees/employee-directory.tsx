"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { formatSalary } from "@/lib/money";
import { EmployeeForm } from "./employee-form";
import type { Employee, EmployeeOptions, EmployeePage, ListFilters } from "./types";

export function EmployeeDirectory({ data, options, filters }: {
  data: EmployeePage;
  options: EmployeeOptions;
  filters: ListFilters;
}) {
  const [formOpen, setFormOpen] = useState(false);
  const [selected, setSelected] = useState<Employee | null>(null);
  const [notice, setNotice] = useState("");

  function openForm(employee: Employee | null) {
    setSelected(employee);
    setNotice("");
    setFormOpen(true);
  }

  function pageUrl(page: number) {
    const params = new URLSearchParams();
    if (filters.query) params.set("q", filters.query);
    if (filters.department) params.set("department", filters.department);
    if (filters.country) params.set("country", filters.country);
    params.set("page", String(page));
    return `/employees?${params}`;
  }

  const first = data.total ? (data.page - 1) * data.pageSize + 1 : 0;
  const last = Math.min(data.page * data.pageSize, data.total);

  return (
    <>
      <div className="page-heading">
        <h1>Employees</h1>
        <Button onClick={() => openForm(null)}>Add employee</Button>
      </div>
      {notice && <p role="status" className="success-message">{notice}</p>}
      <form
        method="get" action="/employees" className="employee-filters"
        key={JSON.stringify([filters.query, filters.department, filters.country])}
      >
        <div className="field filter-search">
          <label htmlFor="employee-search">Search</label>
          <input id="employee-search" name="q" type="search" placeholder="Name or employee ID" maxLength={200} defaultValue={filters.query} />
        </div>
        <div className="field">
          <label htmlFor="department-filter">Department</label>
          <select id="department-filter" name="department" defaultValue={filters.department}>
            <option value="">All departments</option>
            {options.departments.map(name => <option key={name} value={name}>{name}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="country-filter">Work country</label>
          <select id="country-filter" name="country" defaultValue={filters.country}>
            <option value="">All countries</option>
            {options.countries.map(country => <option key={country.code} value={country.code}>{country.name}</option>)}
          </select>
        </div>
        <Button type="submit" variant="quiet" className="filter-apply">Apply filters</Button>
        {(filters.query || filters.country || filters.department) && <Link className="clear-link" href="/employees">Clear filters</Link>}
      </form>
      <div className="result-count">
        Showing {first.toLocaleString("en-US")}–{last.toLocaleString("en-US")} of {data.total.toLocaleString("en-US")} employees
      </div>
      {data.employees.length ? (
        <div className="table-container" role="region" aria-label="Employee results" tabIndex={0}>
          <table className="employee-table">
            <caption className="sr-only">Employee details and annual gross base salaries</caption>
            <thead>
              <tr>
                <th scope="col">Employee ID</th><th scope="col">Full name</th>
                <th scope="col">Department</th><th scope="col">Work country</th>
                <th scope="col" className="salary-column">Annual gross base salary</th><th scope="col"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {data.employees.map(employee => (
                <tr key={employee.id}>
                  <td className="employee-id">{employee.employeeId}</td>
                  <td className="employee-name">{employee.fullName}</td>
                  <td>{employee.department}</td>
                  <td>{employee.countryName}</td>
                  <td className="salary-column">
                    {employee.salaryMinor === null
                      ? <span className="pending-salary">Salary pending</span>
                      : formatSalary(employee.salaryMinor, employee.currencyCode!, employee.minorUnits!)}
                  </td>
                  <td><Button variant="quiet" onClick={() => openForm(employee)} aria-label={`Edit details for ${employee.fullName} (${employee.employeeId})`}>Edit details</Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty-state">
          <p>No employees match your search.</p>
          <Link href="/employees">Clear filters</Link>
        </div>
      )}
      <nav className="pagination" aria-label="Employee pages">
        <span>Page {data.page.toLocaleString("en-US")} of {data.pageCount.toLocaleString("en-US")}</span>
        <div>
          {data.page > 1
            ? <Link className="button button--quiet" href={pageUrl(data.page - 1)}>Previous</Link>
            : <Button variant="quiet" disabled>Previous</Button>}
          {data.page < data.pageCount
            ? <Link className="button button--quiet" href={pageUrl(data.page + 1)}>Next</Link>
            : <Button variant="quiet" disabled>Next</Button>}
        </div>
      </nav>
      {formOpen && (
        <EmployeeForm
          employee={selected} options={options}
          onClose={() => setFormOpen(false)}
          onSaved={message => { setFormOpen(false); setNotice(message); }}
        />
      )}
    </>
  );
}
