import type { Metadata } from "next";
import Link from "next/link";
import { FileText, FilePlus2, Search } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Card, EmptyState, PageHeader } from "@/components/ui/card";
import { Select, inputClass } from "@/components/ui/fields";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDateEs, parseDateEs, todayISO } from "@/lib/dates";
import { formatEUR } from "@/lib/money";
import { displayStatus, STATUS_LABELS, type DisplayStatus } from "@/lib/quote-status";
import { getDb } from "@/server/db/client";
import { listCustomers } from "@/server/repositories/customers";
import { listQuotes } from "@/server/repositories/quotes";

export const metadata: Metadata = { title: "Presupuestos" };

const one = (v: string | string[] | undefined) => (typeof v === "string" ? v : "");
const STATUS_FILTERS = Object.keys(STATUS_LABELS) as DisplayStatus[];

export default async function PresupuestosPage({ searchParams }: PageProps<"/presupuestos">) {
  const params = await searchParams;
  const q = one(params.q);
  const estado = one(params.estado);
  const cliente = one(params.cliente);
  const desde = one(params.desde);
  const hasta = one(params.hasta);
  const from = desde ? (parseDateEs(desde) ?? undefined) : undefined;
  const to = hasta ? (parseDateEs(hasta) ?? undefined) : undefined;
  const status = (STATUS_FILTERS as string[]).includes(estado) ? (estado as DisplayStatus) : undefined;

  const db = await getDb();
  const today = todayISO();
  const [quotes, customers, totalCount] = await Promise.all([
    listQuotes(db, { today, q, status, customerId: cliente || undefined, from, to }),
    listCustomers(db),
    listQuotes(db, { today }).then((l) => l.length),
  ]);
  const filtering = !!(q || status || cliente || from || to);
  const sum = quotes.reduce((a, x) => a + x.totalCents, 0);

  return (
    <>
      <PageHeader
        title="Presupuestos"
        description="Historial de todos los presupuestos que has preparado."
        actions={
          <ButtonLink href="/presupuestos/nuevo">
            <FilePlus2 className="h-4 w-4" aria-hidden /> Nuevo presupuesto
          </ButtonLink>
        }
      />

      {totalCount === 0 ? (
        <EmptyState
          icon={<FileText className="h-6 w-6" />}
          title="Aún no has creado ningún presupuesto"
          description="Crea tu primer presupuesto: elige un cliente, añade partidas y descarga el PDF."
          action={<ButtonLink href="/presupuestos/nuevo"><FilePlus2 className="h-4 w-4" aria-hidden /> Crear presupuesto</ButtonLink>}
        />
      ) : (
        <>
          <form className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1.2fr_9rem_9rem_auto]" role="search">
            <div className="relative">
              <label htmlFor="q" className="sr-only">Buscar presupuestos</label>
              <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
              <input id="q" name="q" defaultValue={q} placeholder="Número, cliente, obra…" className={`${inputClass} pl-9`} />
            </div>
            <Select name="estado" defaultValue={estado} aria-label="Estado">
              <option value="">Todos los estados</option>
              {STATUS_FILTERS.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
            </Select>
            <Select name="cliente" defaultValue={cliente} aria-label="Cliente">
              <option value="">Todos los clientes</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
            <input name="desde" defaultValue={desde} placeholder="Desde DD/MM/AAAA" aria-label="Desde" className={inputClass} />
            <input name="hasta" defaultValue={hasta} placeholder="Hasta DD/MM/AAAA" aria-label="Hasta" className={inputClass} />
            <div className="flex gap-2">
              <button type="submit" className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700">Filtrar</button>
              {filtering && <Link href="/presupuestos" className="flex items-center px-2 text-sm text-slate-500 hover:text-slate-800">Limpiar</Link>}
            </div>
          </form>

          {quotes.length === 0 ? (
            <EmptyState icon={<Search className="h-6 w-6" />} title="Sin resultados" description="Ningún presupuesto coincide con los filtros." action={<ButtonLink href="/presupuestos" variant="secondary">Quitar filtros</ButtonLink>} />
          ) : (
            <Card padded={false} className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50 text-xs font-medium tracking-wide text-slate-500 uppercase">
                    <tr>
                      <th className="px-4 py-3">Número</th>
                      <th className="px-4 py-3">Cliente</th>
                      <th className="hidden px-4 py-3 md:table-cell">Emisión</th>
                      <th className="hidden px-4 py-3 lg:table-cell">Válido hasta</th>
                      <th className="px-4 py-3">Estado</th>
                      <th className="px-4 py-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {quotes.map((x) => (
                      <tr key={x.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-medium whitespace-nowrap">
                          <Link href={`/presupuestos/${x.id}`} className="text-slate-900 hover:text-brand-700">{x.number}</Link>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-slate-900">{x.customerName}</div>
                          {x.title && <div className="max-w-xs truncate text-xs text-slate-500">{x.title}</div>}
                        </td>
                        <td className="hidden px-4 py-3 whitespace-nowrap text-slate-600 tabular-nums md:table-cell">{formatDateEs(x.issueDate)}</td>
                        <td className="hidden px-4 py-3 whitespace-nowrap text-slate-600 tabular-nums lg:table-cell">{x.validUntil ? formatDateEs(x.validUntil) : "—"}</td>
                        <td className="px-4 py-3"><StatusBadge status={displayStatus(x.status, x.validUntil, today)} /></td>
                        <td className="px-4 py-3 text-right font-medium whitespace-nowrap tabular-nums">{formatEUR(x.totalCents)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                <span>{quotes.length} presupuesto{quotes.length === 1 ? "" : "s"}</span>
                <span>Suma: <strong className="tabular-nums text-slate-900">{formatEUR(sum)}</strong></span>
              </div>
            </Card>
          )}
        </>
      )}
    </>
  );
}
