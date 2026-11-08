import type { Metadata } from "next";
import Link from "next/link";
import { Library, Plus, Search } from "lucide-react";
import { ImportStarterButton } from "@/components/catalog/import-starter-button";
import { ButtonLink } from "@/components/ui/button";
import { Card, EmptyState, PageHeader } from "@/components/ui/card";
import { Select, inputClass } from "@/components/ui/fields";
import { markupBpFromCostAndPrice } from "@/lib/calc";
import { formatEUR, formatPercentBp } from "@/lib/money";
import { ITEM_TYPES, ITEM_TYPE_LABELS, type ItemType } from "@/lib/units";
import { getDb } from "@/server/db/client";
import { listCatalogCategories, listCatalogItems } from "@/server/repositories/catalog";

export const metadata: Metadata = { title: "Biblioteca" };

const one = (v: string | string[] | undefined) => (typeof v === "string" ? v : "");

export default async function BibliotecaPage({ searchParams }: PageProps<"/biblioteca">) {
  const params = await searchParams;
  const q = one(params.q);
  const tipo = one(params.tipo);
  const categoria = one(params.categoria);
  const inactivos = one(params.inactivos) === "1";
  const type = (ITEM_TYPES as readonly string[]).includes(tipo) ? (tipo as ItemType) : undefined;

  const db = await getDb();
  const [items, categories, total] = await Promise.all([
    listCatalogItems(db, { q, type, category: categoria || undefined, includeInactive: inactivos }),
    listCatalogCategories(db),
    listCatalogItems(db, { includeInactive: true }).then((l) => l.length),
  ]);
  const filtering = !!(q || type || categoria || inactivos);

  return (
    <>
      <PageHeader
        title="Biblioteca"
        description="Materiales, servicios y mano de obra con su coste, margen e IVA."
        actions={
          <ButtonLink href="/biblioteca/nuevo">
            <Plus className="h-4 w-4" aria-hidden /> Nuevo artículo
          </ButtonLink>
        }
      />

      {total === 0 ? (
        <EmptyState
          icon={<Library className="h-6 w-6" />}
          title="Tu biblioteca está vacía"
          description="Guarda aquí tus materiales y servicios habituales para añadirlos a los presupuestos con un clic. Puedes empezar con unos artículos de ejemplo (precios orientativos que deberás ajustar a tus costes)."
          action={
            <>
              <ButtonLink href="/biblioteca/nuevo"><Plus className="h-4 w-4" aria-hidden /> Nuevo artículo</ButtonLink>
              <ImportStarterButton />
            </>
          }
        />
      ) : (
        <>
          <form className="mb-4 grid gap-3 sm:grid-cols-[1fr_auto_auto_auto]" role="search">
            <div className="relative">
              <label htmlFor="q" className="sr-only">Buscar en la biblioteca</label>
              <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
              <input id="q" name="q" defaultValue={q} placeholder="Buscar por nombre, código o categoría…" className={`${inputClass} pl-9`} />
            </div>
            <Select name="tipo" defaultValue={tipo} aria-label="Tipo">
              <option value="">Todos los tipos</option>
              {ITEM_TYPES.map((t) => <option key={t} value={t}>{ITEM_TYPE_LABELS[t]}</option>)}
            </Select>
            <Select name="categoria" defaultValue={categoria} aria-label="Categoría">
              <option value="">Todas las categorías</option>
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input type="checkbox" name="inactivos" value="1" defaultChecked={inactivos} className="h-4 w-4 rounded border-slate-300 text-brand-600" />
                Ver inactivos
              </label>
              <button type="submit" className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700">Filtrar</button>
            </div>
          </form>

          {items.length === 0 ? (
            <EmptyState icon={<Search className="h-6 w-6" />} title="Sin resultados" description="Ningún artículo coincide con los filtros." action={filtering ? <ButtonLink href="/biblioteca" variant="secondary">Quitar filtros</ButtonLink> : undefined} />
          ) : (
            <Card padded={false} className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50 text-xs font-medium tracking-wide text-slate-500 uppercase">
                    <tr>
                      <th className="px-4 py-3">Artículo</th>
                      <th className="hidden px-4 py-3 md:table-cell">Tipo</th>
                      <th className="px-4 py-3">Ud.</th>
                      <th className="hidden px-4 py-3 text-right lg:table-cell">Coste</th>
                      <th className="hidden px-4 py-3 text-right lg:table-cell">Margen</th>
                      <th className="px-4 py-3 text-right">Precio</th>
                      <th className="hidden px-4 py-3 text-right sm:table-cell">IVA</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items.map((i) => {
                      const markup = markupBpFromCostAndPrice(i.unitCostCents, i.unitPriceCents);
                      return (
                        <tr key={i.id} className={`hover:bg-slate-50 ${i.isActive ? "" : "opacity-60"}`}>
                          <td className="px-4 py-3">
                            <Link href={`/biblioteca/${i.id}`} className="font-medium text-slate-900 hover:text-brand-700">{i.name}</Link>
                            <div className="text-xs text-slate-500">
                              {[i.code, i.category].filter(Boolean).join(" · ")}
                              {!i.isActive && " · Inactivo"}
                            </div>
                          </td>
                          <td className="hidden px-4 py-3 text-slate-600 md:table-cell">{ITEM_TYPE_LABELS[i.itemType]}</td>
                          <td className="px-4 py-3 text-slate-600">{i.unit}</td>
                          <td className="hidden px-4 py-3 text-right tabular-nums text-slate-600 lg:table-cell">{formatEUR(i.unitCostCents)}</td>
                          <td className="hidden px-4 py-3 text-right tabular-nums text-slate-600 lg:table-cell">{markup === null ? "—" : formatPercentBp(markup)}</td>
                          <td className="px-4 py-3 text-right font-medium tabular-nums">{formatEUR(i.unitPriceCents)}</td>
                          <td className="hidden px-4 py-3 text-right tabular-nums text-slate-600 sm:table-cell">{formatPercentBp(i.vatRateBp)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
          <div className="mt-4"><ImportStarterButton variant="ghost" /></div>
        </>
      )}
    </>
  );
}
