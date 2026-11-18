import { requireAuth } from "@/lib/auth/server";

export default async function PaySummaryPage() {
  await requireAuth();
  return <h1>Pay Summary</h1>;
}
