"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function DashboardNav({ staff }: { staff: boolean }) {
  const path = usePathname();
  const items = [
    { href: "/dashboard", label: "Map", active: path === "/dashboard" || (path.startsWith("/dashboard/") && !path.startsWith("/dashboard/akses")) },
    ...(staff ? [{ href: "/dashboard/akses", label: "Akses", active: path.startsWith("/dashboard/akses") }] : []),
  ];
  return (
    <nav className="flex items-center gap-1 rounded-full border border-line bg-panel p-1 text-sm">
      {items.map((i) => (
        <Link
          key={i.href}
          href={i.href}
          className={`rounded-full px-3 py-1 transition ${i.active ? "bg-panel-strong text-text" : "text-muted hover:text-text"}`}
        >
          {i.label}
        </Link>
      ))}
    </nav>
  );
}
