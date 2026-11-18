import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { OrganizationFilters } from "@/components/organization-filters";
import { getEmployeeOptions } from "@/features/employees/repository";
import { readSummaryFilters } from "@/features/pay-summary/filters";
import { getPaySummary } from "@/features/pay-summary/repository";
import { requireAuth } from "@/lib/auth/server";
import { getDatabase } from "@/lib/db/server";
import { formatSalary } from "@/lib/money";

export default async function PaySummaryPage({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAuth();
  const database = getDatabase();
  const options = await getEmployeeOptions(database);
  const { filters, errors } = readSummaryFilters(await searchParams, options);
  const summary = Object.keys(errors).length ? null : await getPaySummary(database, filters);
  const currency = options.currencies.find(item => item.code === filters.currency);
  const metrics = summary && currency ? [
    { label: "Employees included", value: summary.includedCount.toLocaleString("en-US") },
    { label: "Median salary", value: summary.medianMinor === null ? "—" : formatSalary(summary.medianMinor, currency.code, currency.minorUnits) },
    { label: "Lowest salary", value: summary.lowestMinor === null ? "—" : formatSalary(summary.lowestMinor, currency.code, currency.minorUnits) },
    { label: "Highest salary", value: summary.highestMinor === null ? "—" : formatSalary(summary.highestMinor, currency.code, currency.minorUnits) },
  ] : [];

  return (
    <>
      <div className="page-heading"><h1>Pay Summary</h1></div>
      <p className="summary-description">Annual gross base salaries in the selected currency.</p>
      <form
        method="get" action="/pay-summary" className="employee-filters summary-filters"
        key={JSON.stringify(filters)}
      >
        <Field id="summary-currency" label="Currency" error={errors.currency}>
          <select
            id="summary-currency" name="currency" required defaultValue={filters.currency}
            aria-invalid={Boolean(errors.currency)}
            aria-describedby={errors.currency ? "summary-currency-error" : undefined}
          >
            <option value="">Select currency</option>
            {options.currencies.map(item => <option key={item.code} value={item.code}>{item.code}</option>)}
          </select>
        </Field>
        <OrganizationFilters
          departments={options.departments} countries={options.countries}
          department={filters.department} country={filters.country} idPrefix="summary"
          errors={errors}
        />
        <Button type="submit" variant="quiet" className="filter-apply">Apply filters</Button>
        <Link className="clear-link" href="/pay-summary">Reset</Link>
      </form>
      {summary ? (
        <>
          <dl className="summary-metrics">
            {metrics.map(metric => (
              <div className="summary-metric" key={metric.label}>
                <dt>{metric.label}</dt>
                <dd>
                  {metric.value}
                  {metric.label === "Median salary" && summary.medianRounded && currency && (
                    <span className="median-rounding">Rounded to {currency.minorUnits} decimal places.</span>
                  )}
                </dd>
              </div>
            ))}
          </dl>
          {summary.includedCount === 0 && <div className="empty-state summary-empty"><p>No salaries match these filters.</p></div>}
          <div className="pending-summary">
            <p>Pending salaries <strong>{summary.pendingCount.toLocaleString("en-US")} employees</strong></p>
            <p className="muted">Pending salaries are excluded from salary calculations. This count follows the department and work country filters.</p>
          </div>
        </>
      ) : <p role="alert" className="form-error">Choose valid filters to view the pay summary.</p>}
    </>
  );
}
