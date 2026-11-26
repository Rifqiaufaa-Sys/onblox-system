"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function DashboardNav({ staff, badge = 0 }: { staff: boolean; badge?: number }) {
  const path = usePathname();
  const items = [
    { href: "/dashboard", label: "Map", active: path === "/dashboard" || (path.startsWith("/dashboard/") && !path.startsWith("/dashboard/akses")) },
    ...(staff ? [{ href: "/dashboard/akses", label: "Akses", active: path.startsWith("/dashboard/akses"), badge }] : []),
  ];
  return (
    <nav className="flex items-center gap-1 rounded-full border border-line bg-panel p-1 text-sm">
      {items.map((i) => (
        <Link
          key={i.href}
          href={i.href}
          className={`flex-1 rounded-full px-3 py-1 text-center transition sm:flex-none ${i.active ? "bg-panel-strong text-text" : "text-muted hover:text-text"}`}
        >
          {i.label}
          {"badge" in i && i.badge ? (
            <span className="ml-1.5 rounded-full bg-warn px-1.5 text-[10px] font-semibold text-[#0b0913]">{i.badge}</span>
          ) : null}
        </Link>
      ))}
    </nav>
  );
}
