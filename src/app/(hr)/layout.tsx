import { Navigation } from "@/components/navigation";
import { requireAuth } from "@/lib/auth/server";

export default async function HrLayout({ children }: { children: React.ReactNode }) {
  await requireAuth();

  return (
    <>
      <Navigation />
      <main className="page-content">{children}</main>
    </>
  );
}
