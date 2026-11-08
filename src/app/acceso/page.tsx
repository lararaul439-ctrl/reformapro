import type { Metadata } from "next";
import { Hammer } from "lucide-react";
import { safeNextPath } from "@/server/auth/session";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Acceso" };
export const dynamic = "force-dynamic";

export default async function AccesoPage({ searchParams }: PageProps<"/acceso">) {
  const params = await searchParams;
  const next = safeNextPath(typeof params.next === "string" ? params.next : "/");
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
        <div className="mb-6 flex items-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-600 text-white shadow-sm">
            <Hammer className="h-5 w-5" aria-hidden />
          </span>
          <span className="text-xl font-bold tracking-tight text-slate-900">ReformaPro</span>
        </div>
        <h1 className="mb-1 text-base font-semibold text-slate-900">Acceso</h1>
        <p className="mb-5 text-sm text-slate-500">Introduce la contraseña para continuar.</p>
        <LoginForm next={next} />
      </div>
    </main>
  );
}
