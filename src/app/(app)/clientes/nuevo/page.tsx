import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { CustomerForm } from "@/components/customers/customer-form";
import { PageHeader } from "@/components/ui/card";

export const metadata: Metadata = { title: "Nuevo cliente" };

export default async function NuevoClientePage({ searchParams }: PageProps<"/clientes/nuevo">) {
  const params = await searchParams;
  // Solo se admiten rutas internas para volver (evita redirecciones abiertas).
  const next = typeof params.next === "string" && /^\/[a-z0-9/_-]*$/i.test(params.next) ? params.next : undefined;
  return (
    <>
      <PageHeader
        title="Nuevo cliente"
        back={<Link href={next ?? "/clientes"} className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-800"><ArrowLeft className="h-4 w-4" aria-hidden /> Volver</Link>}
      />
      <CustomerForm nextUrl={next} />
    </>
  );
}
