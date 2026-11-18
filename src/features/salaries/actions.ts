"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth/server";
import { getDatabase } from "@/lib/db/server";
import { getEmployeeOptions } from "@/features/employees/repository";
import { updateSalary } from "./repository";
import { validateSalary } from "./validation";
import type { SalaryFormState } from "./types";

export async function saveSalary(form: FormData): Promise<SalaryFormState> {
  await requireAuth();
  const id = Number(form.get("id"));
  const rawRevision = form.get("revision");
  const revision = typeof rawRevision === "string" && /^\d+$/.test(rawRevision) ? Number(rawRevision) : -1;
  const salary = form.get("salary");
  const currency = form.get("currencyCode");
  if (!Number.isSafeInteger(id) || id <= 0 || !Number.isSafeInteger(revision) || revision < 0
    || typeof salary !== "string" || salary.length > 24 || typeof currency !== "string") {
    return { errors: {}, message: "This form is invalid. Close it and try again.", success: false };
  }

  let result;
  try {
    const database = getDatabase();
    const options = await getEmployeeOptions(database);
    const { errors, salaryMinor } = validateSalary(salary, currency, options.currencies);
    if (Object.keys(errors).length || salaryMinor === null) {
      return { errors, message: "Check the highlighted fields.", success: false };
    }
    result = await updateSalary(database, id, salaryMinor, currency, revision);
  } catch (error) {
    console.error("Salary save failed.", error instanceof Error ? error.message : "Unknown database error");
    return { errors: {}, message: "Could not save salary. Try again.", success: false };
  }

  if (result.status === "missing") {
    return { errors: {}, message: "Employee record no longer exists.", success: false };
  }
  revalidatePath("/employees");
  revalidatePath(`/employees/${result.employeeId}`);
  revalidatePath("/pay-summary");
  if (result.status === "conflict") {
    return { errors: {}, message: "Salary changed since you opened this form. Close and reopen it to review the latest salary.", success: false };
  }
  return {
    errors: {}, message: result.status === "unchanged" ? "Salary is already up to date." : "Salary updated.", success: true,
  };
}
