import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { QuoteActions } from "@/components/quotes/quote-actions";
import { ProfitPanel, TotalsTable } from "@/components/quotes/totals";
import { Banner, Card, CardHeader, PageHeader } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDateEs, formatDateTimeEs, todayISO } from "@/lib/dates";
import { formatEUR, formatPercentBp, formatQuantity } from "@/lib/money";
import { calcQuoteDetail } from "@/lib/quote-calc";
import { displayStatus } from "@/lib/quote-status";
import { getDb } from "@/server/db/client";
import { getQuote, listQuoteEvents } from "@/server/repositories/quotes";

export const metadata: Metadata = { title: "Presupuesto" };

const EVENT_LABELS = {
  creado: "Presupuesto creado",
  editado: "Presupuesto editado",
  estado: "Cambio de estado",
  duplicado: "Creado como copia",
} as const;

export default async function PresupuestoPage({ params, searchParams }: PageProps<"/presupuestos/[id]">) {
  const { id } = await params;
  const query = await searchParams;
  const db = await getDb();
  const quote = await getQuote(db, id);
  if (!quote) notFound();
  const events = await listQuoteEvents(db, id);

  const calc = calcQuoteDetail(quote);
  const today = todayISO();
  const status = displayStatus(quote.status, quote.validUntil, today);
  const linesWithoutCost = quote.sections.reduce(
    (n, s) => n + s.lines.filter((l) => l.unitCostCents === 0 && l.unitPriceCents > 0).length,
    0,
  );
  const c = quote.customer;
  const address = [c.address, [c.postalCode, c.city].filter(Boolean).join(" "), c.province].filter(Boolean).join(", ");

  return (
    <>
      <PageHeader
        title={quote.number}
        description={quote.title || undefined}
        back={<Link href="/presupuestos" className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-800"><ArrowLeft className="h-4 w-4" aria-hidden /> Presupuestos</Link>}
        actions={<StatusBadge status={status} className="px-3 py-1 text-sm" />}
      />

      {query.guardado === "1" && <Banner tone="success" className="mb-4">Presupuesto guardado correctamente.</Banner>}
      {status === "caducado" && (
        <Banner tone="warning" className="mb-4">
          La validez de este presupuesto terminó el {formatDateEs(quote.validUntil)}. Puedes duplicarlo para emitir uno nuevo con fecha actual.
        </Banner>
      )}

      <div className="mb-6"><QuoteActions id={quote.id} number={quote.number} status={quote.status} /></div>

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem] lg:items-start">
        <div className="min-w-0 space-y-6">
          <Card>
            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <h2 className="mb-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">Cliente</h2>
                <p className="font-medium text-slate-900">
                  <Link href={`/clientes/${quote.customerId}`} className="hover:text-brand-700">{c.name}</Link>
                </p>
                <div className="mt-1 space-y-0.5 text-sm text-slate-600">
                  {c.taxId && <p>{c.taxId}</p>}
                  {address && <p>{address}</p>}
                  {c.email && <p>{c.email}</p>}
                  {c.phone && <p>{c.phone}</p>}
                </div>
              </div>
              <div>
                <h2 className="mb-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">Presupuesto</h2>
                <dl className="space-y-1 text-sm">
                  <div className="flex justify-between gap-4"><dt className="text-slate-500">Emisión</dt><dd className="tabular-nums">{formatDateEs(quote.issueDate)}</dd></div>
                  <div className="flex justify-between gap-4"><dt className="text-slate-500">Válido hasta</dt><dd className="tabular-nums">{quote.validUntil ? formatDateEs(quote.validUntil) : "Sin límite"}</dd></div>
                  {quote.workAddress && <div className="flex justify-between gap-4"><dt className="shrink-0 text-slate-500">Obra</dt><dd className="text-right">{quote.workAddress}</dd></div>}
                </dl>
              </div>
            </div>
            {quote.introText && <p className="mt-5 border-t border-slate-100 pt-4 text-sm whitespace-pre-line text-slate-700">{quote.introText}</p>}
          </Card>

          {quote.sections.map((s, si) => (
            <Card key={s.id} padded={false} className="overflow-hidden">
              <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 sm:px-5">
                <h2 className="font-semibold text-slate-900">{s.title || (quote.sections.length > 1 ? `Capítulo ${si + 1}` : "Partidas")}</h2>
                <span className="text-sm text-slate-600 tabular-nums">{formatEUR(calc.sections[si].subtotalCents)}</span>
              </div>
              {s.lines.length === 0 ? (
                <p className="px-5 py-6 text-sm text-slate-500">Sin partidas.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full table-fixed text-left text-sm">
                    <colgroup>
                      <col />
                      <col className="w-20 sm:w-24" />
                      <col className="w-20 sm:w-24" />
                      <col className="hidden w-16 sm:table-column" />
                      <col className="hidden w-16 sm:table-column" />
                      <col className="w-24 sm:w-28" />
                    </colgroup>
                    <thead className="text-xs text-slate-500">
                      <tr className="border-b border-slate-100">
                        <th className="px-4 py-2 font-medium sm:px-5">Descripción</th>
                        <th className="px-2 py-2 text-right font-medium">Cant.</th>
                        <th className="px-2 py-2 text-right font-medium">Precio</th>
                        <th className="hidden px-2 py-2 text-right font-medium sm:table-cell">Dto.</th>
                        <th className="hidden px-2 py-2 text-right font-medium sm:table-cell">IVA</th>
                        <th className="px-4 py-2 text-right font-medium sm:px-5">Importe</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {s.lines.map((l, li) => (
                        <tr key={l.id} className="align-top">
                          <td className="px-4 py-2.5 whitespace-pre-line sm:px-5">{l.code && <span className="mr-1 text-xs text-slate-400">{l.code}</span>}{l.description}</td>
                          <td className="px-2 py-2.5 text-right whitespace-nowrap tabular-nums">{formatQuantity(l.quantity)} {l.unit}</td>
                          <td className="px-2 py-2.5 text-right whitespace-nowrap tabular-nums">{formatEUR(l.unitPriceCents)}</td>
                          <td className="hidden px-2 py-2.5 text-right whitespace-nowrap tabular-nums text-slate-500 sm:table-cell">{l.discountBp ? formatPercentBp(l.discountBp) : "—"}</td>
                          <td className="hidden px-2 py-2.5 text-right whitespace-nowrap tabular-nums text-slate-500 sm:table-cell">{formatPercentBp(l.vatRateBp)}</td>
                          <td className="px-4 py-2.5 text-right font-medium whitespace-nowrap tabular-nums sm:px-5">{formatEUR(calc.sections[si].lines[li].netCents)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          ))}

          {(quote.paymentTerms || quote.conditions) && (
            <Card>
              {quote.paymentTerms && (
                <div className="mb-4">
                  <h2 className="mb-1 text-xs font-semibold tracking-wide text-slate-500 uppercase">Forma de pago</h2>
                  <p className="text-sm whitespace-pre-line text-slate-700">{quote.paymentTerms}</p>
                </div>
              )}
              {quote.conditions && (
                <div>
                  <h2 className="mb-1 text-xs font-semibold tracking-wide text-slate-500 uppercase">Condiciones</h2>
                  <p className="text-sm whitespace-pre-line text-slate-700">{quote.conditions}</p>
                </div>
              )}
            </Card>
          )}
          {quote.internalNotes && (
            <Card className="bg-amber-50/50">
              <h2 className="mb-1 text-xs font-semibold tracking-wide text-amber-800 uppercase">Notas internas (no aparecen en el PDF)</h2>
              <p className="text-sm whitespace-pre-line text-slate-700">{quote.internalNotes}</p>
            </Card>
          )}
        </div>

        <div className="space-y-6 lg:sticky lg:top-4">
          <Card>
            <CardHeader title="Totales" />
            <TotalsTable calc={calc} globalDiscountBp={quote.globalDiscountBp} />
          </Card>
          <Card>
            <CardHeader title="Rentabilidad" description="Solo uso interno." />
            <ProfitPanel calc={calc} linesWithoutCost={linesWithoutCost} />
          </Card>
          <Card>
            <CardHeader title="Historial" />
            <ol className="space-y-3 text-sm">
              {events.map((e) => (
                <li key={e.id}>
                  <p className="font-medium text-slate-800">{EVENT_LABELS[e.type] ?? e.type}</p>
                  {e.detail && <p className="text-slate-600">{e.detail}</p>}
                  <p className="text-xs text-slate-400 tabular-nums">{formatDateTimeEs(e.createdAt)}</p>
                </li>
              ))}
            </ol>
          </Card>
        </div>
      </div>
    </>
  );
}
