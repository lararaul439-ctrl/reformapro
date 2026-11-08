import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Search, Users } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Card, EmptyState, PageHeader } from "@/components/ui/card";
import { inputClass } from "@/components/ui/fields";
import { formatEUR } from "@/lib/money";
import { getDb } from "@/server/db/client";
import { listCustomers } from "@/server/repositories/customers";

export const metadata: Metadata = { title: "Clientes" };

export default async function ClientesPage({ searchParams }: PageProps<"/clientes">) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q : "";
  const customers = await listCustomers(await getDb(), { q });

  return (
    <>
      <PageHeader
        title="Clientes"
        description="Personas y empresas a las que preparas presupuestos."
        actions={
          <ButtonLink href="/clientes/nuevo">
            <Plus className="h-4 w-4" aria-hidden /> Nuevo cliente
          </ButtonLink>
        }
      />

      <form className="mb-4 max-w-md" role="search">
        <label htmlFor="q" className="sr-only">Buscar clientes</label>
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
          <input id="q" name="q" defaultValue={q} placeholder="Buscar por nombre, NIF, teléfono, población…" className={`${inputClass} pl-9`} />
        </div>
      </form>

      {customers.length === 0 ? (
        q ? (
          <EmptyState icon={<Search className="h-6 w-6" />} title="Sin resultados" description={`No hay clientes que coincidan con «${q}».`} action={<ButtonLink href="/clientes" variant="secondary">Ver todos</ButtonLink>} />
        ) : (
          <EmptyState icon={<Users className="h-6 w-6" />} title="Todavía no tienes clientes" description="Crea tu primer cliente para empezar a preparar presupuestos." action={<ButtonLink href="/clientes/nuevo"><Plus className="h-4 w-4" aria-hidden /> Nuevo cliente</ButtonLink>} />
        )
      ) : (
        <Card padded={false} className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-medium tracking-wide text-slate-500 uppercase">
                <tr>
                  <th className="px-4 py-3">Cliente</th>
                  <th className="hidden px-4 py-3 md:table-cell">Contacto</th>
                  <th className="hidden px-4 py-3 lg:table-cell">Población</th>
                  <th className="px-4 py-3 text-right">Presupuestos</th>
                  <th className="hidden px-4 py-3 text-right sm:table-cell">Importe total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {customers.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <Link href={`/clientes/${c.id}`} className="font-medium text-slate-900 hover:text-brand-700">
                        {c.name}
                      </Link>
                      <div className="text-xs text-slate-500">
                        {c.kind === "empresa" ? "Empresa" : "Particular"}
                        {c.taxId && ` · ${c.taxId}`}
                      </div>
                    </td>
                    <td className="hidden px-4 py-3 text-slate-600 md:table-cell">
                      <div>{c.email || "—"}</div>
                      <div className="text-xs text-slate-500">{c.phone}</div>
                    </td>
                    <td className="hidden px-4 py-3 text-slate-600 lg:table-cell">{[c.city, c.province].filter(Boolean).join(", ") || "—"}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{c.quoteCount}</td>
                    <td className="hidden px-4 py-3 text-right tabular-nums text-slate-600 sm:table-cell">{c.quoteCount ? formatEUR(c.quotedTotalCents) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </>
  );
}
