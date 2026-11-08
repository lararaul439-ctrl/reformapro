import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { QuoteEditor } from "@/components/quotes/quote-editor";
import { quoteToEditorState } from "@/components/quotes/editor-model";
import { PageHeader } from "@/components/ui/card";
import { getDb } from "@/server/db/client";
import { listCatalogItems } from "@/server/repositories/catalog";
import { listCustomers } from "@/server/repositories/customers";
import { getQuote } from "@/server/repositories/quotes";
import { getDefaultTaxRate, listTaxRates } from "@/server/repositories/tax-rates";

export const metadata: Metadata = { title: "Editar presupuesto" };

export default async function EditarPresupuestoPage({ params }: PageProps<"/presupuestos/[id]/editar">) {
  const { id } = await params;
  const db = await getDb();
  const quote = await getQuote(db, id);
  if (!quote) notFound();
  const [customers, catalog, taxRates, defaultRate] = await Promise.all([
    listCustomers(db),
    listCatalogItems(db),
    listTaxRates(db),
    getDefaultTaxRate(db),
  ]);

  return (
    <>
      <PageHeader
        title={`Editar ${quote.number}`}
        back={<Link href={`/presupuestos/${id}`} className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-800"><ArrowLeft className="h-4 w-4" aria-hidden /> Volver al presupuesto</Link>}
      />
      <QuoteEditor
        mode="edit"
        quoteId={id}
        quoteNumber={quote.number}
        initial={quoteToEditorState(quote)}
        customers={customers.map(({ id, name, taxId, address, postalCode, city, province }) => ({ id, name, taxId, address, postalCode, city, province }))}
        catalog={catalog}
        taxRates={taxRates}
        defaultVatBp={defaultRate?.rateBp ?? 2100}
      />
    </>
  );
}
