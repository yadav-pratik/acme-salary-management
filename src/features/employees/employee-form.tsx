"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { saveEmployee } from "./actions";
import type { Employee, EmployeeFormState, EmployeeOptions, EmployeeValues } from "./types";

export function EmployeeForm({ employee, options, onClose, onSaved }: {
  employee: Employee | null;
  options: EmployeeOptions;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const [creationToken] = useState(() => crypto.randomUUID());
  const [values, setValues] = useState<EmployeeValues>({
    fullName: employee?.fullName ?? "",
    department: employee?.department ?? "",
    countryCode: employee?.countryCode ?? "",
    salary: "",
    currencyCode: "",
  });
  const initial: EmployeeFormState = { errors: {}, message: "", success: false };
  const [state, action, pending] = useActionState(async (_previous: EmployeeFormState, form: FormData) => {
    const result = await saveEmployee(form);
    if (result.success) onSaved(result.message);
    return result;
  }, initial);

  function setValue(key: keyof EmployeeValues, value: string) {
    setValues(current => ({ ...current, [key]: value }));
  }

  function errorAttributes(key: keyof EmployeeValues) {
    return {
      "aria-invalid": Boolean(state.errors[key]),
      "aria-describedby": state.errors[key] ? `employee-${key}-error` : undefined,
    };
  }

  return (
    <Dialog title={employee ? "Edit employee details" : "Add employee"} busy={pending} onClose={onClose}>
      <form action={action} noValidate aria-busy={pending} className="employee-form">
        {employee
          ? <input type="hidden" name="id" value={employee.id} />
          : <input type="hidden" name="creationToken" value={creationToken} />}
        <fieldset disabled={pending}>
          <div className="field">
            <label htmlFor="employee-id">Employee ID</label>
            <input id="employee-id" value={employee?.employeeId ?? "Assigned on save"} readOnly />
          </div>
          <Field id="employee-fullName" label="Full name" error={state.errors.fullName}>
            <input
              id="employee-fullName" name="fullName" autoComplete="name"
              value={values.fullName} maxLength={120} required
              onChange={event => setValue("fullName", event.target.value)}
              {...errorAttributes("fullName")}
            />
          </Field>
          <Field id="employee-department" label="Department" error={state.errors.department}>
            <select
              id="employee-department" name="department" value={values.department} required
              onChange={event => setValue("department", event.target.value)}
              {...errorAttributes("department")}
            >
              <option value="">Select department</option>
              {options.departments.map(name => <option key={name} value={name}>{name}</option>)}
            </select>
          </Field>
          <Field id="employee-countryCode" label="Work country" error={state.errors.countryCode}>
            <select
              id="employee-countryCode" name="countryCode" value={values.countryCode} required
              onChange={event => setValue("countryCode", event.target.value)}
              {...errorAttributes("countryCode")}
            >
              <option value="">Select country</option>
              {options.countries.map(country => <option key={country.code} value={country.code}>{country.name}</option>)}
            </select>
          </Field>
          {!employee && (
            <div className="salary-fields">
              <Field id="employee-salary" label="Annual gross base salary (optional)" error={state.errors.salary}>
                <input
                  id="employee-salary" name="salary" inputMode="decimal" placeholder="e.g. 120000"
                  value={values.salary} maxLength={24}
                  onChange={event => setValue("salary", event.target.value)}
                  {...errorAttributes("salary")}
                />
              </Field>
              <Field id="employee-currencyCode" label="Currency" error={state.errors.currencyCode}>
                <select
                  id="employee-currencyCode" name="currencyCode" value={values.currencyCode}
                  onChange={event => setValue("currencyCode", event.target.value)}
                  {...errorAttributes("currencyCode")}
                >
                  <option value="">Select currency</option>
                  {options.currencies.map(currency => <option key={currency.code} value={currency.code}>{currency.code}</option>)}
                </select>
              </Field>
              <p className="muted">Leave both blank if salary is pending.</p>
            </div>
          )}
        </fieldset>
        {state.message && <p role="alert" className="form-error">{state.message}</p>}
        <div className="dialog-actions">
          <Button variant="quiet" type="button" onClick={onClose} disabled={pending}>Cancel</Button>
          <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save employee"}</Button>
        </div>
      </form>
    </Dialog>
  );
}
