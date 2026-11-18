import { Field } from "./ui/field";

export function OrganizationFilters({ departments, countries, department, country, idPrefix, errors = {} }: {
  departments: string[];
  countries: { code: string; name: string }[];
  department: string;
  country: string;
  idPrefix: string;
  errors?: { department?: string; country?: string };
}) {
  return (
    <>
      <Field id={`${idPrefix}-department`} label="Department" error={errors.department}>
        <select
          id={`${idPrefix}-department`} name="department" defaultValue={department}
          aria-invalid={Boolean(errors.department)}
          aria-describedby={errors.department ? `${idPrefix}-department-error` : undefined}
        >
          <option value="">All departments</option>
          {departments.map(name => <option key={name} value={name}>{name}</option>)}
        </select>
      </Field>
      <Field id={`${idPrefix}-country`} label="Work country" error={errors.country}>
        <select
          id={`${idPrefix}-country`} name="country" defaultValue={country}
          aria-invalid={Boolean(errors.country)}
          aria-describedby={errors.country ? `${idPrefix}-country-error` : undefined}
        >
          <option value="">All countries</option>
          {countries.map(item => <option key={item.code} value={item.code}>{item.name}</option>)}
        </select>
      </Field>
    </>
  );
}
