import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import LoginForm from "./LoginForm";

export default function LoginPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-6">
      <div className="rise glass w-full max-w-sm rounded-3xl p-8">
        <h1 className="text-2xl font-semibold tracking-tight">Masuk</h1>
        <p className="mt-1 text-sm text-muted">Dashboard OnBlox System</p>
        <Suspense fallback={<LoginForm />}>
          <AlreadyLoggedIn />
        </Suspense>
      </div>
    </main>
  );
}

/** Kalau sudah login, langsung ke dashboard. */
async function AlreadyLoggedIn() {
  const session = await getSession().catch(() => null);
  if (session) redirect("/dashboard");
  return <LoginForm />;
}
