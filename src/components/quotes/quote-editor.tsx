"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import {
  ArrowDown,
  ArrowUp,
  BookPlus,
  Copy,
  Eye,
  EyeOff,
  Plus,
  Trash2,
} from "lucide-react";
import { saveQuoteAction } from "@/app/actions/quotes";
import { Button, ButtonLink } from "@/components/ui/button";
import { Banner, Card, CardHeader } from "@/components/ui/card";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { DateField } from "@/components/ui/date-field";
import { Field, Select, TextArea, TextInput } from "@/components/ui/fields";
import { MoneyField, PercentField, QuantityField } from "@/components/ui/number-fields";
import {
  calcLine,
  calcQuote,
  markupBpFromCostAndPrice,
  normalizeQuantity,
  priceFromCostAndMarkup,
} from "@/lib/calc";
import { cn } from "@/lib/cn";
import { formatEUR, formatPercentBp } from "@/lib/money";
import { vatOptions } from "@/lib/tax-options";
import type { CatalogItem, Customer, TaxRate } from "@/lib/types";
import { COMMON_UNITS } from "@/lib/units";
import { CatalogPicker } from "./catalog-picker";
import {
  blankLine,
  blankSection,
  lineFromCatalog,
  newKey,
  toCalcInput,
  toPayload,
  validateState,
  type EditorLine,
  type EditorSection,
  type EditorState,
} from "./editor-model";
import { ProfitPanel, TotalsTable } from "./totals";

export type CustomerOption = Pick<
  Customer,
  "id" | "name" | "taxId" | "address" | "postalCode" | "city" | "province"
>;

function move<T>(arr: T[], index: number, delta: number): T[] {
  const target = index + delta;
  if (target < 0 || target >= arr.length) return arr;
  const copy = [...arr];
  [copy[index], copy[target]] = [copy[target], copy[index]];
  return copy;
}

export function QuoteEditor({
  mode,
  quoteId,
  quoteNumber,
  initial,
  customers,
  catalog,
  taxRates,
  defaultVatBp,
}: {
  mode: "create" | "edit";
  quoteId?: string;
  quoteNumber?: string;
  initial: EditorState;
  customers: CustomerOption[];
  catalog: CatalogItem[];
  taxRates: TaxRate[];
  defaultVatBp: number;
}) {
  const router = useRouter();
  const [state, setState] = useState<EditorState>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState(false);
  const [showCosts, setShowCosts] = useState(true);
  const [pickerSection, setPickerSection] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);

  // Aviso del navegador si se intenta salir con cambios sin guardar.
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  const calc = useMemo(() => calcQuote(toCalcInput(state)), [state]);
  const linesWithoutCost = useMemo(
    () =>
      state.sections.reduce(
        (n, s) =>
          n + s.lines.filter((l) => (l.unitCostCents ?? 0) === 0 && (l.unitPriceCents ?? 0) > 0).length,
        0,
      ),
    [state.sections],
  );
  const customer = customers.find((c) => c.id === state.customerId);

  // ---- helpers de actualización -------------------------------------------------

  function clearError(prefix: string) {
    setErrors((e) => {
      const keys = Object.keys(e).filter((k) => k === prefix || k.startsWith(prefix + "."));
      if (keys.length === 0) return e;
      const next = { ...e };
      keys.forEach((k) => delete next[k]);
      return next;
    });
  }

  function patch(p: Partial<EditorState>) {
    setState((s) => ({ ...s, ...p }));
    setDirty(true);
    Object.keys(p).forEach(clearError);
  }

  function mutateSections(fn: (sections: EditorSection[]) => EditorSection[]) {
    setState((s) => ({ ...s, sections: fn(s.sections) }));
    setDirty(true);
  }

  function patchLine(si: number, li: number, p: Partial<EditorLine>) {
    mutateSections((sections) =>
      sections.map((s, i) =>
        i !== si ? s : { ...s, lines: s.lines.map((l, j) => (j !== li ? l : { ...l, ...p })) },
      ),
    );
    Object.keys(p).forEach((k) => clearError(`sections.${si}.lines.${li}.${k}`));
  }

  function addLines(si: number, lines: EditorLine[]) {
    mutateSections((sections) =>
      sections.map((s, i) => (i !== si ? s : { ...s, lines: [...s.lines, ...lines] })),
    );
  }

  function save(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    const found = validateState(state);
    if (Object.keys(found).length > 0) {
      setErrors(found);
      setFormError("Revisa los campos marcados en rojo antes de guardar.");
      return;
    }
    startTransition(async () => {
      const res = await saveQuoteAction(quoteId ?? null, toPayload(state));
      if (!res.ok) {
        setErrors(res.errors ?? {});
        setFormError(res.message);
        return;
      }
      setDirty(false);
      router.push(`/presupuestos/${res.id}?guardado=1`);
    });
  }

  const pickerTarget = state.sections.findIndex((s) => s.key === pickerSection);

  return (
    <form onSubmit={save} noValidate className="space-y-6 pb-24">
      {formError && <Banner tone="error">{formError}</Banner>}
      {customers.length === 0 && (
        <Banner tone="warning">
          Todavía no hay clientes.{" "}
          <Link href="/clientes/nuevo?next=/presupuestos/nuevo" className="font-medium underline">
            Crea el primero
          </Link>{" "}
          para poder guardar el presupuesto.
        </Banner>
      )}

      {/* ----------------------------------------------------------- Datos generales */}
      <Card>
        <CardHeader
          title="Datos generales"
          description={mode === "edit" ? `Presupuesto ${quoteNumber}` : "El número se asigna al guardar."}
        />
        <div className="grid gap-4 sm:grid-cols-6">
          <Field label="Cliente" htmlFor="customerId" required error={errors.customerId} className="sm:col-span-4">
            <Select
              id="customerId"
              value={state.customerId}
              invalid={!!errors.customerId}
              onChange={(e) => patch({ customerId: e.target.value })}
            >
              <option value="">Selecciona un cliente…</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.taxId ? ` · ${c.taxId}` : ""}
                </option>
              ))}
            </Select>
          </Field>
          <div className="flex items-end sm:col-span-2">
            {mode === "create" && (
              <ButtonLink href="/clientes/nuevo?next=/presupuestos/nuevo" variant="secondary" className="w-full">
                <Plus className="h-4 w-4" aria-hidden /> Nuevo cliente
              </ButtonLink>
            )}
          </div>

          <Field label="Título del presupuesto" htmlFor="title" className="sm:col-span-6" hint="Ej.: Reforma integral de baño">
            <TextInput id="title" value={state.title} onChange={(e) => patch({ title: e.target.value })} />
          </Field>

          <Field label="Dirección de la obra" htmlFor="workAddress" className="sm:col-span-6">
            <div className="flex gap-2">
              <TextInput id="workAddress" value={state.workAddress} onChange={(e) => patch({ workAddress: e.target.value })} />
              <Button
                variant="secondary"
                disabled={!customer}
                title={customer ? "Copiar la dirección del cliente" : "Selecciona primero un cliente"}
                onClick={() =>
                  customer &&
                  patch({
                    workAddress: [customer.address, `${customer.postalCode} ${customer.city}`.trim(), customer.province]
                      .filter(Boolean)
                      .join(", "),
                  })
                }
              >
                Usar la del cliente
              </Button>
            </div>
          </Field>

          <Field label="Fecha de emisión" htmlFor="issueDate" required error={errors.issueDate} className="sm:col-span-3">
            <DateField id="issueDate" value={state.issueDate} invalid={!!errors.issueDate} onChange={(v) => patch({ issueDate: v })} />
          </Field>
          <Field label="Válido hasta" htmlFor="validUntil" error={errors.validUntil} hint="Vacío = sin fecha de validez" className="sm:col-span-3">
            <DateField id="validUntil" value={state.validUntil} invalid={!!errors.validUntil} onChange={(v) => patch({ validUntil: v })} />
          </Field>
        </div>
      </Card>

      {/* ----------------------------------------------------- Capítulos y partidas */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-slate-900">Capítulos y partidas</h2>
          <button
            type="button"
            onClick={() => setShowCosts((v) => !v)}
            aria-pressed={showCosts}
            className="inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
          >
            {showCosts ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
            {showCosts ? "Ocultar costes y márgenes" : "Mostrar costes y márgenes"}
          </button>
        </div>
        {showCosts && (
          <p className="-mt-2 text-xs text-slate-500">
            Coste y margen son datos internos: nunca aparecen en el PDF ni en lo que ve el cliente.
          </p>
        )}

        {state.sections.map((section, si) => {
          const sectionCalc = calc.sections[si];
          return (
            <Card key={section.key} padded={false} className="overflow-hidden">
              {/* Cabecera del capítulo */}
              <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 sm:px-5">
                <div className="min-w-48 flex-1">
                  <label htmlFor={`${section.key}-title`} className="sr-only">Nombre del capítulo {si + 1}</label>
                  <input
                    id={`${section.key}-title`}
                    value={section.title}
                    onChange={(e) => {
                      mutateSections((ss) => ss.map((s, i) => (i === si ? { ...s, title: e.target.value } : s)));
                    }}
                    placeholder={`Capítulo ${si + 1} (p. ej. Albañilería)`}
                    className="w-full rounded-lg border-0 bg-transparent px-2 py-1.5 text-base font-semibold text-slate-900 ring-1 ring-transparent placeholder:font-normal placeholder:text-slate-400 hover:ring-slate-300 focus:bg-white focus:ring-2 focus:ring-brand-600"
                  />
                </div>
                <div className="text-sm text-slate-500">
                  Subtotal <strong className="ml-1 text-slate-900 tabular-nums">{formatEUR(sectionCalc?.subtotalCents ?? 0)}</strong>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" aria-label="Subir capítulo" disabled={si === 0} onClick={() => mutateSections((ss) => move(ss, si, -1))}>
                    <ArrowUp className="h-4 w-4" aria-hidden />
                  </Button>
                  <Button variant="ghost" size="icon" aria-label="Bajar capítulo" disabled={si === state.sections.length - 1} onClick={() => mutateSections((ss) => move(ss, si, 1))}>
                    <ArrowDown className="h-4 w-4" aria-hidden />
                  </Button>
                  {state.sections.length > 1 &&
                    (section.lines.length > 0 ? (
                      <ConfirmButton
                        variant="ghost"
                        size="icon"
                        title="Eliminar capítulo"
                        message={<>Se eliminará el capítulo y sus {section.lines.length} partida(s). Los cambios no se guardan hasta pulsar «Guardar».</>}
                        onConfirm={() => mutateSections((ss) => ss.filter((_, i) => i !== si))}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" aria-hidden />
                        <span className="sr-only">Eliminar capítulo</span>
                      </ConfirmButton>
                    ) : (
                      <Button variant="ghost" size="icon" aria-label="Eliminar capítulo" onClick={() => mutateSections((ss) => ss.filter((_, i) => i !== si))}>
                        <Trash2 className="h-4 w-4 text-red-500" aria-hidden />
                      </Button>
                    ))}
                </div>
              </div>

              {/* Partidas */}
              {section.lines.length === 0 ? (
                <p className="px-5 py-8 text-center text-sm text-slate-500">Este capítulo aún no tiene partidas.</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {section.lines.map((line, li) => (
                    <LineRow
                      key={line.key}
                      line={line}
                      index={li}
                      count={section.lines.length}
                      sectionIndex={si}
                      net={sectionCalc?.lines[li]?.netCents ?? 0}
                      showCosts={showCosts}
                      taxRates={taxRates}
                      errors={errors}
                      onPatch={(p) => patchLine(si, li, p)}
                      onMove={(d) =>
                        mutateSections((ss) =>
                          ss.map((s, i) => (i !== si ? s : { ...s, lines: move(s.lines, li, d) })),
                        )
                      }
                      onDuplicate={() =>
                        mutateSections((ss) =>
                          ss.map((s, i) => {
                            if (i !== si) return s;
                            const copy = [...s.lines];
                            copy.splice(li + 1, 0, { ...line, key: newKey() });
                            return { ...s, lines: copy };
                          }),
                        )
                      }
                      onRemove={() =>
                        mutateSections((ss) =>
                          ss.map((s, i) => (i !== si ? s : { ...s, lines: s.lines.filter((_, j) => j !== li) })),
                        )
                      }
                    />
                  ))}
                </ul>
              )}

              <div className="flex flex-wrap gap-2 border-t border-slate-100 bg-white px-4 py-3 sm:px-5">
                <Button variant="secondary" size="sm" onClick={() => addLines(si, [blankLine(defaultVatBp)])}>
                  <Plus className="h-4 w-4" aria-hidden /> Añadir partida
                </Button>
                <Button variant="secondary" size="sm" onClick={() => setPickerSection(section.key)}>
                  <BookPlus className="h-4 w-4" aria-hidden /> Añadir de la biblioteca
                </Button>
              </div>
            </Card>
          );
        })}

        <Button variant="secondary" onClick={() => mutateSections((ss) => [...ss, blankSection()])}>
          <Plus className="h-4 w-4" aria-hidden /> Añadir capítulo
        </Button>
      </div>

      {/* ------------------------------------------------ Textos + totales */}
      <div className="grid gap-6 lg:grid-cols-[1fr_22rem] lg:items-start">
        <Card>
          <CardHeader title="Textos del presupuesto" />
          <div className="grid gap-4">
            <Field label="Texto introductorio" htmlFor="introText" hint="Aparece antes de las partidas en el PDF.">
              <TextArea id="introText" rows={3} value={state.introText} onChange={(e) => patch({ introText: e.target.value })} />
            </Field>
            <Field label="Forma de pago" htmlFor="paymentTerms">
              <TextArea id="paymentTerms" rows={3} value={state.paymentTerms} onChange={(e) => patch({ paymentTerms: e.target.value })} />
            </Field>
            <Field label="Condiciones" htmlFor="conditions">
              <TextArea id="conditions" rows={5} value={state.conditions} onChange={(e) => patch({ conditions: e.target.value })} />
            </Field>
            <Field label="Notas internas" htmlFor="internalNotes" hint="No aparecen en el PDF.">
              <TextArea id="internalNotes" rows={3} value={state.internalNotes} onChange={(e) => patch({ internalNotes: e.target.value })} />
            </Field>
          </div>
        </Card>

        <div className="space-y-6 lg:sticky lg:top-4">
          <Card>
            <CardHeader title="Totales" />
            <TotalsTable
              calc={calc}
              globalDiscountBp={state.globalDiscountBp ?? 0}
              discountControl={
                <span className="flex items-center gap-2">
                  Descuento global
                  <span className="w-24">
                    <PercentField
                      aria-label="Descuento global"
                      bp={state.globalDiscountBp}
                      invalid={!!errors.globalDiscountBp}
                      onChange={(bp) => patch({ globalDiscountBp: bp })}
                      className="h-8 py-1"
                    />
                  </span>
                </span>
              }
            />
            <p className="mt-4 text-xs leading-relaxed text-slate-500">
              El tipo de IVA se elige en cada partida. ReformaPro no comprueba si es el aplicable: verifica sus
              requisitos antes de emitir el presupuesto.
            </p>
          </Card>
          <Card>
            <CardHeader title="Rentabilidad" description="Solo uso interno." />
            <ProfitPanel calc={calc} linesWithoutCost={linesWithoutCost} />
          </Card>
        </div>
      </div>

      {/* ----------------------------------------------------- Barra de acciones */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 backdrop-blur lg:left-64">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-10">
          <div className="text-sm">
            <span className="text-slate-500">Total </span>
            <strong className="text-lg tabular-nums text-slate-900">{formatEUR(calc.totalCents)}</strong>
            {dirty && <span className="ml-3 text-xs text-amber-700">Cambios sin guardar</span>}
          </div>
          <div className="flex gap-2">
            <ButtonLink href={quoteId ? `/presupuestos/${quoteId}` : "/presupuestos"} variant="secondary">
              Cancelar
            </ButtonLink>
            <Button type="submit" disabled={pending}>
              {pending ? "Guardando…" : mode === "create" ? "Guardar presupuesto" : "Guardar cambios"}
            </Button>
          </div>
        </div>
      </div>

      <datalist id="unidades-editor">
        {COMMON_UNITS.map((u) => <option key={u} value={u} />)}
      </datalist>

      <CatalogPicker
        open={pickerSection !== null}
        items={catalog}
        targetLabel={
          pickerTarget >= 0 ? state.sections[pickerTarget].title || `Capítulo ${pickerTarget + 1}` : ""
        }
        onAdd={(item) => pickerTarget >= 0 && addLines(pickerTarget, [lineFromCatalog(item)])}
        onClose={() => setPickerSection(null)}
      />
    </form>
  );
}

// ---------------------------------------------------------------------------------
// Una partida
// ---------------------------------------------------------------------------------

function LineRow({
  line,
  index,
  count,
  sectionIndex,
  net,
  showCosts,
  taxRates,
  errors,
  onPatch,
  onMove,
  onDuplicate,
  onRemove,
}: {
  line: EditorLine;
  index: number;
  count: number;
  sectionIndex: number;
  net: number;
  showCosts: boolean;
  taxRates: TaxRate[];
  errors: Record<string, string>;
  onPatch: (p: Partial<EditorLine>) => void;
  onMove: (delta: number) => void;
  onDuplicate: () => void;
  onRemove: () => void;
}) {
  const path = `sections.${sectionIndex}.lines.${index}`;
  const err = (field: string) => errors[`${path}.${field}`];
  const firstError = Object.entries(errors).find(([k]) => k.startsWith(path + "."))?.[1];
  const cost = line.unitCostCents ?? 0;
  const price = line.unitPriceCents ?? 0;
  const markupBp = markupBpFromCostAndPrice(cost, price);
  const id = (f: string) => `${line.key}-${f}`;
  const discounted = (line.discountBp ?? 0) > 0;
  const gross = calcLine({
    quantity: normalizeQuantity(line.quantity ?? 0),
    unitCostCents: cost,
    unitPriceCents: price,
    discountBp: 0,
    vatRateBp: line.vatRateBp,
  }).grossCents;

  return (
    <li className="px-4 py-4 sm:px-5">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <label htmlFor={id("description")} className="sr-only">Descripción de la partida {index + 1}</label>
          <TextArea
            id={id("description")}
            rows={2}
            value={line.description}
            invalid={!!err("description")}
            placeholder="Descripción de la partida"
            onChange={(e) => onPatch({ description: e.target.value })}
            className="min-h-[3.25rem]"
          />
        </div>
        <div className="flex shrink-0 items-center">
          <Button variant="ghost" size="icon" aria-label="Subir partida" disabled={index === 0} onClick={() => onMove(-1)}>
            <ArrowUp className="h-4 w-4" aria-hidden />
          </Button>
          <Button variant="ghost" size="icon" aria-label="Bajar partida" disabled={index === count - 1} onClick={() => onMove(1)}>
            <ArrowDown className="h-4 w-4" aria-hidden />
          </Button>
          <Button variant="ghost" size="icon" aria-label="Duplicar partida" onClick={onDuplicate}>
            <Copy className="h-4 w-4" aria-hidden />
          </Button>
          <Button variant="ghost" size="icon" aria-label="Eliminar partida" onClick={onRemove}>
            <Trash2 className="h-4 w-4 text-red-500" aria-hidden />
          </Button>
        </div>
      </div>

      <div
        className={cn(
          "mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4",
          showCosts ? "lg:grid-cols-8" : "lg:grid-cols-6",
        )}
      >
        <MiniField label="Unidad" htmlFor={id("unit")}>
          <TextInput id={id("unit")} list="unidades-editor" value={line.unit} onChange={(e) => onPatch({ unit: e.target.value })} />
        </MiniField>
        <MiniField label="Cantidad" htmlFor={id("qty")} error={err("quantity")}>
          <QuantityField id={id("qty")} value={line.quantity} invalid={!!err("quantity")} onChange={(v) => onPatch({ quantity: v })} />
        </MiniField>
        {showCosts && (
          <>
            <MiniField label="Coste ud." htmlFor={id("cost")} error={err("unitCostCents")}>
              <MoneyField id={id("cost")} cents={line.unitCostCents} invalid={!!err("unitCostCents")} onChange={(c) => onPatch({ unitCostCents: c })} />
            </MiniField>
            <MiniField label="Margen s/ coste" htmlFor={id("markup")}>
              <PercentField
                id={id("markup")}
                bp={markupBp}
                disabled={cost <= 0}
                title={cost <= 0 ? "Indica un coste para calcular el margen" : undefined}
                onChange={(bp) => bp !== null && onPatch({ unitPriceCents: priceFromCostAndMarkup(cost, bp) })}
              />
            </MiniField>
          </>
        )}
        <MiniField label="Precio ud." htmlFor={id("price")} error={err("unitPriceCents")}>
          <MoneyField id={id("price")} cents={line.unitPriceCents} invalid={!!err("unitPriceCents")} onChange={(c) => onPatch({ unitPriceCents: c })} />
        </MiniField>
        <MiniField label="Dto." htmlFor={id("discount")} error={err("discountBp")}>
          <PercentField id={id("discount")} bp={line.discountBp} invalid={!!err("discountBp")} onChange={(bp) => onPatch({ discountBp: bp })} />
        </MiniField>
        <MiniField label="IVA" htmlFor={id("vat")}>
          <Select id={id("vat")} value={line.vatRateBp} onChange={(e) => onPatch({ vatRateBp: Number(e.target.value) })}>
            {vatOptions(taxRates, line.vatRateBp).map((o) => (
              <option key={o.bp} value={o.bp} title={o.label}>{formatPercentBp(o.bp)}</option>
            ))}
          </Select>
        </MiniField>
        <div className="min-w-0">
          <span className="mb-1 block text-xs font-medium text-slate-500">Importe</span>
          <div className="flex h-[38px] flex-col items-end justify-center rounded-lg bg-slate-50 px-3 text-right ring-1 ring-slate-200 ring-inset">
            <span className="text-sm leading-tight font-semibold tabular-nums text-slate-900" data-testid="line-net">{formatEUR(net)}</span>
            {discounted && <span className="text-[10px] leading-tight text-slate-400 tabular-nums line-through">{formatEUR(gross)}</span>}
          </div>
        </div>
      </div>
      {firstError && (
        <p role="alert" className="mt-2 text-xs text-red-600">{firstError}</p>
      )}
    </li>
  );
}

function MiniField({
  label,
  htmlFor,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <label htmlFor={htmlFor} className="mb-1 block truncate text-xs font-medium text-slate-500" title={error}>
        {label}
      </label>
      {children}
    </div>
  );
}
