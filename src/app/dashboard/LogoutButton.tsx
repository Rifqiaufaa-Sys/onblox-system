"use client";

import { useRouter } from "next/navigation";

export default function LogoutButton({ label = "Keluar" }: { label?: string }) {
  const router = useRouter();
  return (
    <button
      className="btn btn-ghost"
      onClick={async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        router.replace("/login");
        router.refresh();
      }}
    >
      {label}
    </button>
  );
}
