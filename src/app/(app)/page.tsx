import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, Circle, FilePlus2, FileText, Library, Settings, Users } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardHeader, PageHeader } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDateEs, todayISO } from "@/lib/dates";
import { formatEUR } from "@/lib/money";
import { displayStatus } from "@/lib/quote-status";
import { getDb } from "@/server/db/client";
import { listCatalogItems } from "@/server/repositories/catalog";
import { getCompany } from "@/server/repositories/company";
import { listCustomers } from "@/server/repositories/customers";
import { getDashboardStats } from "@/server/repositories/quotes";

export const metadata: Metadata = { title: "Panel" };

export default async function PanelPage() {
  const db = await getDb();
  const today = todayISO();
  const [stats, company, customers, catalog] = await Promise.all([
    getDashboardStats(db, today),
    getCompany(db),
    listCustomers(db),
    listCatalogItems(db, { includeInactive: true }),
  ]);

  const steps = [
    { done: !!(company.legalName || company.tradeName) && !!company.taxId, label: "Completa los datos de tu empresa", href: "/configuracion", icon: Settings },
    { done: customers.length > 0, label: "Crea tu primer cliente", href: "/clientes/nuevo", icon: Users },
    { done: catalog.length > 0, label: "Añade materiales y servicios a la biblioteca", href: "/biblioteca", icon: Library },
    { done: stats.recent.length > 0, label: "Prepara tu primer presupuesto", href: "/presupuestos/nuevo", icon: FileText },
  ];
  const pending = steps.filter((s) => !s.done);

  const kpis = [
    { label: "Borradores", value: String(stats.draftCount), href: "/presupuestos?estado=borrador" },
    { label: "Enviados y vigentes", value: String(stats.sentCount), hint: stats.sentCount ? formatEUR(stats.openTotalCents) : undefined, href: "/presupuestos?estado=enviado" },
    { label: "Aceptados", value: String(stats.acceptedCount), hint: `${formatEUR(stats.acceptedYearTotalCents)} este año`, href: "/presupuestos?estado=aceptado" },
    { label: "Caducados", value: String(stats.expiredCount), href: "/presupuestos?estado=caducado" },
  ];

  return (
    <>
      <PageHeader
        title="Panel"
        description={`Hoy es ${formatDateEs(today)}.`}
        actions={<ButtonLink href="/presupuestos/nuevo"><FilePlus2 className="h-4 w-4" aria-hidden /> Nuevo presupuesto</ButtonLink>}
      />

      {pending.length > 0 && (
        <Card className="mb-6 border-brand-100 bg-brand-50/40">
          <CardHeader title="Primeros pasos" description="Termina de configurar ReformaPro para trabajar con comodidad." />
          <ul className="grid gap-2 sm:grid-cols-2">
            {steps.map((s) => (
              <li key={s.href}>
                <Link href={s.href} className="flex items-center gap-3 rounded-lg bg-white px-4 py-3 text-sm ring-1 ring-slate-200 hover:ring-brand-300">
                  {s.done ? <CheckCircle2 className="h-5 w-5 text-emerald-500" aria-hidden /> : <Circle className="h-5 w-5 text-slate-300" aria-hidden />}
                  <span className={s.done ? "text-slate-400 line-through" : "font-medium text-slate-800"}>{s.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map((k) => (
          <Link key={k.label} href={k.href} className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200 transition hover:ring-brand-300">
            <p className="text-sm text-slate-500">{k.label}</p>
            <p className="mt-1 text-3xl font-semibold tracking-tight tabular-nums text-slate-900">{k.value}</p>
            {k.hint && <p className="mt-1 text-xs text-slate-500 tabular-nums">{k.hint}</p>}
          </Link>
        ))}
      </div>

      <Card padded={false}>
        <div className="flex items-center justify-between px-5 pt-5 sm:px-6">
          <h2 className="text-base font-semibold text-slate-900">Últimos presupuestos</h2>
          <Link href="/presupuestos" className="text-sm font-medium text-brand-700 hover:underline">Ver todos</Link>
        </div>
        {stats.recent.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-slate-500">Todavía no hay presupuestos.</p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-100">
            {stats.recent.map((q) => (
              <li key={q.id}>
                <Link href={`/presupuestos/${q.id}`} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 hover:bg-slate-50 sm:px-6">
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900">{q.number} <span className="font-normal text-slate-600">· {q.customerName}</span></p>
                    <p className="truncate text-xs text-slate-500">{q.title || "Sin título"} · {formatDateEs(q.issueDate)}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <StatusBadge status={displayStatus(q.status, q.validUntil, today)} />
                    <span className="w-28 text-right font-medium tabular-nums">{formatEUR(q.totalCents)}</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
