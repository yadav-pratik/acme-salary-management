import Link from "next/link";

export default function EmployeeNotFound() {
  return (
    <section className="empty-state">
      <h1>Employee not found</h1>
      <p>This employee record could not be found.</p>
      <Link href="/employees">Back to employees</Link>
    </section>
  );
}
