"use client";

import { Button } from "@/components/ui/button";

export default function PaySummaryError({ reset }: { reset: () => void }) {
  return (
    <section className="empty-state">
      <h1>Could not load pay summary</h1>
      <p>Please try again.</p>
      <Button onClick={reset}>Try again</Button>
    </section>
  );
}
