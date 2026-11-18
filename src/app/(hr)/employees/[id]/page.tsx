import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth/server";
import { getDatabase } from "@/lib/db/server";
import { getEmployeeOptions } from "@/features/employees/repository";
import { readListFilters } from "@/features/employees/validation";
import { getEmployeeProfile } from "@/features/salaries/repository";
import { EmployeeProfile } from "@/features/salaries/employee-profile";

export default async function EmployeeProfilePage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAuth();
  const { id } = await params;
  if (!/^EMP-\d{5,}$/.test(id)) notFound();

  const database = getDatabase();
  const { page } = readListFilters(await searchParams);
  const [data, options] = await Promise.all([
    getEmployeeProfile(database, id, page),
    getEmployeeOptions(database),
  ]);
  if (!data) notFound();
  return <EmployeeProfile data={data} options={options} />;
}
