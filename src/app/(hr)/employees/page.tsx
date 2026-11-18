import { requireAuth } from "@/lib/auth/server";
import { getDatabase } from "@/lib/db/server";
import { EmployeeDirectory } from "@/features/employees/employee-directory";
import { getEmployeeOptions, listEmployees } from "@/features/employees/repository";
import { readListFilters } from "@/features/employees/validation";

export default async function EmployeesPage({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAuth();
  const filters = readListFilters(await searchParams);
  const database = getDatabase();
  const [data, options] = await Promise.all([
    listEmployees(database, filters),
    getEmployeeOptions(database),
  ]);
  return <EmployeeDirectory data={data} options={options} filters={filters} />;
}
