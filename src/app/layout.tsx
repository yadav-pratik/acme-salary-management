import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ACME Salary Management",
  description: "Employee records and salary management for ACME HR.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
