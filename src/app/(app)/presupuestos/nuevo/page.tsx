import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { QuoteEditor } from "@/components/quotes/quote-editor";
import { blankSection, type EditorState } from "@/components/quotes/editor-model";
import { PageHeader } from "@/components/ui/card";
import { addDaysISO, todayISO } from "@/lib/dates";
import { getDb } from "@/server/db/client";
import { listCatalogItems } from "@/server/repositories/catalog";
import { getCompany } from "@/server/repositories/company";
import { listCustomers } from "@/server/repositories/customers";
import { getDefaultTaxRate, listTaxRates } from "@/server/repositories/tax-rates";

export const metadata: Metadata = { title: "Nuevo presupuesto" };

export default async function NuevoPresupuestoPage({ searchParams }: PageProps<"/presupuestos/nuevo">) {
  const params = await searchParams;
  const db = await getDb();
  const [company, customers, catalog, taxRates, defaultRate] = await Promise.all([
    getCompany(db),
    listCustomers(db),
    listCatalogItems(db),
    listTaxRates(db),
    getDefaultTaxRate(db),
  ]);
  const today = todayISO();
  const wanted = typeof params.cliente === "string" ? params.cliente : "";

  const initial: EditorState = {
    customerId: customers.some((c) => c.id === wanted) ? wanted : "",
    title: "",
    workAddress: "",
    issueDate: today,
    validUntil: addDaysISO(today, company.defaultValidityDays),
    globalDiscountBp: 0,
    introText: "",
    paymentTerms: company.defaultPaymentTerms,
    conditions: company.defaultConditions,
    internalNotes: "",
    sections: [blankSection()],
  };

  return (
    <>
      <PageHeader
        title="Nuevo presupuesto"
        back={<Link href="/presupuestos" className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-800"><ArrowLeft className="h-4 w-4" aria-hidden /> Presupuestos</Link>}
      />
      <QuoteEditor
        mode="create"
        initial={initial}
        customers={customers.map(({ id, name, taxId, address, postalCode, city, province }) => ({ id, name, taxId, address, postalCode, city, province }))}
        catalog={catalog}
        taxRates={taxRates}
        defaultVatBp={defaultRate?.rateBp ?? 2100}
      />
    </>
  );
}
