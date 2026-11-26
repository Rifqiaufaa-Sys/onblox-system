import { Suspense } from "react";
import LoginOptions from "@/components/LoginOptions";

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <main className="flex flex-1 items-center justify-center px-6">
      <div className="rise glass w-full max-w-sm rounded-3xl p-8">
        <h1 className="text-2xl font-semibold tracking-tight">Masuk</h1>
        <p className="mt-1 text-sm text-muted">Dashboard OnBlox System</p>
        <Suspense fallback={<div className="mt-6 h-24" />}>
          <LoginOptions searchParams={searchParams} />
        </Suspense>
      </div>
    </main>
  );
}
