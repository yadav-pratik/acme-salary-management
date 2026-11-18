import { requireAuth } from "@/lib/auth/server";

export default async function EmployeesPage() {
  await requireAuth();
  return <h1>Employees</h1>;
}
