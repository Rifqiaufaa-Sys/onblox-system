import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import LogoutButton from "./LogoutButton";
import SetupNeeded from "@/components/SetupNeeded";

export default function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  return (
    <Suspense fallback={<Loading />}>
      <Gate>{children}</Gate>
    </Suspense>
  );
}

/** Cek login (baca cookie = data runtime, jadi dirender saat request, di dalam Suspense). */
async function Gate({ children }: { children: React.ReactNode }) {
  let session = null;
  try {
    session = await getSession();
  } catch (e) {
    return <SetupNeeded message={String((e as Error).message)} />;
  }
  if (!session) redirect("/login");

  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-20 border-b border-line bg-[rgba(7,6,11,0.7)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/dashboard" className="font-semibold tracking-tight">
            OnBlox<span className="text-accent">.</span> <span className="text-muted font-normal">dashboard</span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden items-center gap-2 text-sm text-muted sm:flex">
              {session.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={session.avatar} alt="" width={28} height={28} className="h-7 w-7 rounded-full" />
              ) : (
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-panel-strong text-xs">
                  {session.name.slice(0, 1).toUpperCase()}
                </span>
              )}
              {session.name}
            </span>
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">{children}</main>
    </div>
  );
}

function Loading() {
  return (
    <div className="flex flex-1 items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-line border-t-accent" />
    </div>
  );
}
