import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { CatalogForm } from "@/components/catalog/catalog-form";
import { PageHeader } from "@/components/ui/card";
import { getDb } from "@/server/db/client";
import { getCatalogItem, listCatalogCategories } from "@/server/repositories/catalog";
import { getCompany } from "@/server/repositories/company";
import { getDefaultTaxRate, listTaxRates } from "@/server/repositories/tax-rates";

export const metadata: Metadata = { title: "Artículo" };

export default async function ArticuloPage({ params }: PageProps<"/biblioteca/[id]">) {
  const { id } = await params;
  const db = await getDb();
  const item = await getCatalogItem(db, id);
  if (!item) notFound();
  const [categories, taxRates, company, defaultRate] = await Promise.all([
    listCatalogCategories(db), listTaxRates(db), getCompany(db), getDefaultTaxRate(db),
  ]);
  return (
    <>
      <PageHeader
        title={item.name}
        back={<Link href="/biblioteca" className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-800"><ArrowLeft className="h-4 w-4" aria-hidden /> Biblioteca</Link>}
      />
      <CatalogForm item={item} categories={categories} taxRates={taxRates} defaultMarkupBp={company.defaultMarkupBp} defaultVatBp={defaultRate?.rateBp ?? 2100} />
    </>
  );
}
