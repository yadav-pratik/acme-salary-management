"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/features/auth/actions";
import { BrandMark } from "./brand-mark";
import { Button } from "./ui/button";

const links = [
  { href: "/employees", label: "Employees" },
  { href: "/pay-summary", label: "Pay Summary" },
];

export function Navigation() {
  const pathname = usePathname();

  return (
    <header className="app-header">
      <Link href="/employees" className="brand">
        <BrandMark />
        <span className="brand-copy"><strong>ACME</strong><span>Salary Management</span></span>
      </Link>
      <nav aria-label="Main navigation" className="navigation">
        {links.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            aria-current={pathname.startsWith(href) ? "page" : undefined}
          >
            {label}
          </Link>
        ))}
      </nav>
      <form action={signOut}><Button variant="quiet" type="submit">Sign out</Button></form>
    </header>
  );
}
