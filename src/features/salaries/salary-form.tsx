"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import type { Employee } from "@/features/employees/types";
import { salaryInputValue } from "@/lib/money";
import { saveSalary } from "./actions";
import type { SalaryFormState } from "./types";

export function SalaryForm({ employee, revision, currencies, onClose, onSaved }: {
  employee: Employee;
  revision: number;
  currencies: { code: string; minorUnits: number }[];
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const [expectedRevision] = useState(revision);
  const [salary, setSalary] = useState(employee.salaryMinor === null ? "" : salaryInputValue(employee.salaryMinor, employee.minorUnits!));
  const [currency, setCurrency] = useState(employee.currencyCode ?? "");
  const initial: SalaryFormState = { errors: {}, message: "", success: false };
  const [state, action, pending] = useActionState(async (_previous: SalaryFormState, form: FormData) => {
    const result = await saveSalary(form);
    if (result.success) onSaved(result.message);
    return result;
  }, initial);

  return (
    <Dialog title={employee.salaryMinor === null ? "Add salary" : "Update salary"} busy={pending} onClose={onClose}>
      <form action={action} className="employee-form" noValidate aria-busy={pending}>
        <input type="hidden" name="id" value={employee.id} />
        <input type="hidden" name="revision" value={expectedRevision} />
        <fieldset disabled={pending}>
          <Field id="salary-amount" label="Annual gross base salary" error={state.errors.salary}>
            <input
              id="salary-amount" name="salary" inputMode="decimal" value={salary} required maxLength={24}
              onChange={event => setSalary(event.target.value)}
              aria-invalid={Boolean(state.errors.salary)}
              aria-describedby={state.errors.salary ? "salary-amount-error" : undefined}
            />
          </Field>
          <Field id="salary-currency" label="Currency" error={state.errors.currencyCode}>
            <select
              id="salary-currency" name="currencyCode" value={currency} required
              onChange={event => setCurrency(event.target.value)}
              aria-invalid={Boolean(state.errors.currencyCode)}
              aria-describedby={state.errors.currencyCode ? "salary-currency-error" : undefined}
            >
              <option value="">Select currency</option>
              {currencies.map(item => <option key={item.code} value={item.code}>{item.code}</option>)}
            </select>
          </Field>
          <p className="muted">Changes take effect immediately on save.</p>
        </fieldset>
        {state.message && <p role="alert" className="form-error">{state.message}</p>}
        <div className="dialog-actions">
          <Button type="button" variant="quiet" onClick={onClose} disabled={pending}>Cancel</Button>
          <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save salary"}</Button>
        </div>
      </form>
    </Dialog>
  );
}
