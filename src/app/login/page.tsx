import { redirect } from "next/navigation";
import { BrandMark } from "@/components/brand-mark";
import { LoginForm } from "@/features/auth/login-form";
import { isAuthenticated } from "@/lib/auth/server";

export default async function LoginPage() {
  if (await isAuthenticated()) {
    redirect("/employees");
  }

  return (
    <main className="login-page">
      <section className="login-card" aria-labelledby="login-heading">
        <BrandMark />
        <h1 id="login-heading">ACME <span>Salary Management</span></h1>
        <LoginForm />
      </section>
    </main>
  );
}
