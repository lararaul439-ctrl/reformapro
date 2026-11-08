import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FilePlus2 } from "lucide-react";
import { CustomerForm } from "@/components/customers/customer-form";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardHeader, PageHeader } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDateEs, todayISO } from "@/lib/dates";
import { formatEUR } from "@/lib/money";
import { displayStatus } from "@/lib/quote-status";
import { getDb } from "@/server/db/client";
import { getCustomer } from "@/server/repositories/customers";
import { listQuotes } from "@/server/repositories/quotes";

export const metadata: Metadata = { title: "Cliente" };

export default async function ClientePage({ params }: PageProps<"/clientes/[id]">) {
  const { id } = await params;
  const db = await getDb();
  const customer = await getCustomer(db, id);
  if (!customer) notFound();
  const today = todayISO();
  const quotes = await listQuotes(db, { today, customerId: id });

  return (
    <>
      <PageHeader
        title={customer.name}
        back={<Link href="/clientes" className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-800"><ArrowLeft className="h-4 w-4" aria-hidden /> Clientes</Link>}
        actions={
          <ButtonLink href={`/presupuestos/nuevo?cliente=${customer.id}`}>
            <FilePlus2 className="h-4 w-4" aria-hidden /> Nuevo presupuesto
          </ButtonLink>
        }
      />
      <div className="space-y-6">
        <CustomerForm customer={customer} canDelete={quotes.length === 0} />
        <Card>
          <CardHeader title="Presupuestos del cliente" description={quotes.length ? `${quotes.length} en total` : "Aún no hay presupuestos para este cliente."} />
          {quotes.length > 0 && (
            <ul className="divide-y divide-slate-100">
              {quotes.map((q) => (
                <li key={q.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                  <div className="min-w-0">
                    <Link href={`/presupuestos/${q.id}`} className="font-medium text-slate-900 hover:text-brand-700">{q.number}</Link>
                    <span className="ml-2 text-sm text-slate-500">{q.title}</span>
                    <div className="text-xs text-slate-500">{formatDateEs(q.issueDate)}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={displayStatus(q.status, q.validUntil, today)} />
                    <span className="w-28 text-right text-sm font-medium tabular-nums">{formatEUR(q.totalCents)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
