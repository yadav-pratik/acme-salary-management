import { redirect } from "next/navigation";
import { LoginForm } from "@/features/auth/login-form";
import { isAuthenticated } from "@/lib/auth/server";

export default async function LoginPage() {
  if (await isAuthenticated()) {
    redirect("/employees");
  }

  return (
    <main className="login-page">
      <section className="login-card" aria-labelledby="login-heading">
        <h1 id="login-heading">ACME <span>Salary Management</span></h1>
        <LoginForm />
      </section>
    </main>
  );
}
