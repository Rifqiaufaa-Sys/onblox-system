import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { ROLE_LABEL, getAccess, isStaff, type Access } from "@/lib/access";
import LogoutButton from "./LogoutButton";
import SetupNeeded from "@/components/SetupNeeded";
import DashboardNav from "@/components/DashboardNav";

export default function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  return (
    <Suspense fallback={<Loading />}>
      <Gate>{children}</Gate>
    </Suspense>
  );
}

/**
 * Header + navigasi. Catatan: ini BUKAN pengaman — tiap page tetap cek aksesnya sendiri
 * (page dirender paralel dengan layout).
 */
async function Gate({ children }: { children: React.ReactNode }) {
  let access: Access | null;
  try {
    access = await getAccess();
  } catch (e) {
    return <SetupNeeded message={String((e as Error).message)} />;
  }
  if (!access) redirect("/login");
  const { session, role } = access;

  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-20 border-b border-line bg-[rgba(7,6,11,0.7)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="font-semibold tracking-tight">
              OnBlox<span className="text-accent">.</span>{" "}
              <span className="font-normal text-muted">system</span>
            </Link>
            {role !== "none" && <DashboardNav staff={isStaff(access)} />}
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden items-center gap-2.5 sm:flex">
              {session.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={session.avatar} alt="" width={30} height={30} className="h-[30px] w-[30px] rounded-full" />
              ) : (
                <span className="flex h-[30px] w-[30px] items-center justify-center rounded-full bg-panel-strong text-xs">
                  {session.name.slice(0, 1).toUpperCase()}
                </span>
              )}
              <span className="leading-tight">
                <span className="block text-sm">{session.name}</span>
                <span className="block text-[11px] text-muted">{ROLE_LABEL[role]}</span>
              </span>
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
