"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteCatalogItemAction, saveCatalogItemAction } from "@/app/actions/catalog";
import { useForm } from "@/components/forms/use-form";
import { Button, ButtonLink } from "@/components/ui/button";
import { Banner, Card, CardHeader } from "@/components/ui/card";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { Field, Select, TextArea, TextInput } from "@/components/ui/fields";
import { MoneyField, PercentField } from "@/components/ui/number-fields";
import { markupBpFromCostAndPrice, priceFromCostAndMarkup } from "@/lib/calc";
import { formatEUR } from "@/lib/money";
import { vatOptions } from "@/lib/tax-options";
import type { CatalogItem, TaxRate } from "@/lib/types";
import { COMMON_UNITS, ITEM_TYPES, ITEM_TYPE_LABELS, type ItemType } from "@/lib/units";

export function CatalogForm({
  item,
  categories,
  taxRates,
  defaultMarkupBp,
  defaultVatBp,
}: {
  item?: CatalogItem;
  categories: string[];
  taxRates: TaxRate[];
  defaultMarkupBp: number;
  defaultVatBp: number;
}) {
  const router = useRouter();
  const form = useForm({
    code: item?.code ?? "",
    name: item?.name ?? "",
    description: item?.description ?? "",
    itemType: (item?.itemType ?? "material") as ItemType,
    category: item?.category ?? "",
    unit: item?.unit ?? "ud",
    unitCostCents: item?.unitCostCents ?? (0 as number | null),
    unitPriceCents: item?.unitPriceCents ?? (0 as number | null),
    vatRateBp: item?.vatRateBp ?? defaultVatBp,
    isActive: item?.isActive ?? true,
  });
  const { values: v, set, errors } = form;
  const [priceManual, setPriceManual] = useState(!!item);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const cost = v.unitCostCents ?? 0;
  const price = v.unitPriceCents ?? 0;
  const markupBp = markupBpFromCostAndPrice(cost, price);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    if (v.unitCostCents === null || v.unitPriceCents === null) {
      form.setErrors({
        ...(v.unitCostCents === null ? { unitCostCents: "Introduce un importe" } : {}),
        ...(v.unitPriceCents === null ? { unitPriceCents: "Introduce un importe" } : {}),
      });
      setMessage({ tone: "error", text: "Revisa los campos marcados en rojo." });
      return;
    }
    startTransition(async () => {
      const res = await saveCatalogItemAction(item?.id ?? null, v);
      if (!res.ok) {
        form.setErrors(res.errors ?? {});
        setMessage({ tone: "error", text: res.message });
        return;
      }
      form.setDirty(false);
      if (!item) router.push("/biblioteca");
      else {
        setMessage({ tone: "success", text: "Cambios guardados." });
        router.refresh();
      }
    });
  }

  return (
    <form onSubmit={submit} className="space-y-6" noValidate>
      {message && <Banner tone={message.tone}>{message.text}</Banner>}

      <Card>
        <CardHeader title="Descripción" />
        <div className="grid gap-4 sm:grid-cols-6">
          <Field label="Código" htmlFor="code" className="sm:col-span-2" hint="Opcional. Ej.: ALB-01">
            <TextInput id="code" value={v.code} onChange={(e) => set("code", e.target.value)} />
          </Field>
          <Field label="Nombre" htmlFor="name" required error={errors.name} className="sm:col-span-4">
            <TextInput id="name" value={v.name} invalid={!!errors.name} onChange={(e) => set("name", e.target.value)} autoFocus={!item} />
          </Field>
          <Field label="Tipo" htmlFor="itemType" className="sm:col-span-2">
            <Select id="itemType" value={v.itemType} onChange={(e) => set("itemType", e.target.value as ItemType)}>
              {ITEM_TYPES.map((t) => (
                <option key={t} value={t}>{ITEM_TYPE_LABELS[t]}</option>
              ))}
            </Select>
          </Field>
          <Field label="Categoría" htmlFor="category" className="sm:col-span-2" hint="Ej.: Albañilería, Fontanería…">
            <TextInput id="category" list="categorias" value={v.category} onChange={(e) => set("category", e.target.value)} />
            <datalist id="categorias">
              {categories.map((c) => <option key={c} value={c} />)}
            </datalist>
          </Field>
          <Field label="Unidad" htmlFor="unit" required error={errors.unit} className="sm:col-span-2">
            <TextInput id="unit" list="unidades" value={v.unit} invalid={!!errors.unit} onChange={(e) => set("unit", e.target.value)} />
            <datalist id="unidades">
              {COMMON_UNITS.map((u) => <option key={u} value={u} />)}
            </datalist>
          </Field>
          <Field label="Texto para el presupuesto" htmlFor="description" className="sm:col-span-6" hint="Descripción ampliada que se copiará a la partida (opcional).">
            <TextArea id="description" rows={3} value={v.description} onChange={(e) => set("description", e.target.value)} />
          </Field>
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Precio e impuesto"
          description="El coste es interno y nunca aparece en el PDF. El margen se calcula sobre el coste."
        />
        <div className="grid gap-4 sm:grid-cols-4">
          <Field label="Coste unitario" htmlFor="cost" error={errors.unitCostCents}>
            <MoneyField
              id="cost"
              cents={v.unitCostCents}
              invalid={!!errors.unitCostCents}
              onChange={(c) => {
                set("unitCostCents", c);
                if (!priceManual && c !== null) {
                  set("unitPriceCents", priceFromCostAndMarkup(c, defaultMarkupBp));
                }
              }}
            />
          </Field>
          <Field
            label="Margen s/ coste"
            htmlFor="markup"
            hint={cost > 0 ? undefined : "Indica un coste para calcularlo"}
          >
            <PercentField
              id="markup"
              bp={markupBp}
              disabled={cost <= 0}
              onChange={(bp) => {
                if (bp === null) return;
                setPriceManual(true);
                set("unitPriceCents", priceFromCostAndMarkup(cost, bp));
              }}
            />
          </Field>
          <Field label="Precio de venta (sin IVA)" htmlFor="price" error={errors.unitPriceCents}>
            <MoneyField
              id="price"
              cents={v.unitPriceCents}
              invalid={!!errors.unitPriceCents}
              onChange={(c) => {
                setPriceManual(true);
                set("unitPriceCents", c);
              }}
            />
          </Field>
          <Field label="Tipo de IVA" htmlFor="vat" hint="Revisa que sea el aplicable al trabajo.">
            <Select id="vat" value={v.vatRateBp} onChange={(e) => set("vatRateBp", Number(e.target.value))}>
              {vatOptions(taxRates, v.vatRateBp).map((o) => (
                <option key={o.bp} value={o.bp}>{o.label}</option>
              ))}
            </Select>
          </Field>
        </div>
        {cost > 0 && price > 0 && (
          <p className="mt-3 text-sm text-slate-500">
            Beneficio por unidad: <strong className="text-slate-700">{formatEUR(price - cost)}</strong>
          </p>
        )}
      </Card>

      <Card>
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={v.isActive}
            onChange={(e) => set("isActive", e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-600"
          />
          <span>
            <span className="block text-sm font-medium text-slate-900">Artículo activo</span>
            <span className="block text-sm text-slate-500">Los artículos inactivos no aparecen al añadir partidas a un presupuesto.</span>
          </span>
        </label>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          <Button type="submit" disabled={pending}>
            {pending ? "Guardando…" : item ? "Guardar cambios" : "Crear artículo"}
          </Button>
          <ButtonLink href="/biblioteca" variant="secondary">Cancelar</ButtonLink>
        </div>
        {item && (
          <ConfirmButton
            title="Eliminar artículo"
            message={<>Se eliminará <strong>{item.name}</strong> de la biblioteca. Los presupuestos ya creados no cambian.</>}
            onConfirm={async () => {
              const res = await deleteCatalogItemAction(item.id);
              if (!res.ok) return res.message;
              router.push("/biblioteca");
            }}
          >
            Eliminar artículo
          </ConfirmButton>
        )}
      </div>
    </form>
  );
}
