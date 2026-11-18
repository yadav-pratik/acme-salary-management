"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth/server";
import { getDatabase } from "@/lib/db/server";
import { createEmployee, getEmployeeOptions, updateEmployeeDetails } from "./repository";
import { readEmployeeValues, validateEmployee } from "./validation";
import type { EmployeeFormState } from "./types";

export async function saveEmployee(form: FormData): Promise<EmployeeFormState> {
  await requireAuth();
  const rawId = form.get("id");
  const creating = rawId === null;
  const id = typeof rawId === "string" && /^\d+$/.test(rawId) ? Number(rawId) : 0;
  const token = form.get("creationToken");
  if ((!creating && (!Number.isSafeInteger(id) || id <= 0))
    || (creating && (typeof token !== "string" || !/^[0-9a-f-]{36}$/i.test(token)))) {
    return { errors: {}, message: "This form is invalid. Close it and try again.", success: false };
  }

  let employeeId: string;
  try {
    const database = getDatabase();
    const values = readEmployeeValues(form);
    const options = await getEmployeeOptions(database);
    const { errors, salaryMinor } = validateEmployee(values, options, creating);
    if (Object.keys(errors).length) {
      return { errors, message: "Check the highlighted fields.", success: false };
    }
    employeeId = creating
      ? await createEmployee(database, values, salaryMinor, token as string)
      : await updateEmployeeDetails(database, id, values);
  } catch (error) {
    console.error("Employee save failed.", error instanceof Error ? error.message : "Unknown database error");
    return { errors: {}, message: "Could not save employee. Try again.", success: false };
  }

  revalidatePath("/employees");
  revalidatePath("/pay-summary");
  revalidatePath(`/employees/${employeeId}`);
  return { errors: {}, message: creating ? `Employee ${employeeId} added.` : `Employee ${employeeId} updated.`, success: true };
}
