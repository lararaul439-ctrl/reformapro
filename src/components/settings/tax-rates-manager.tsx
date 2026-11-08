"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import {
  createTaxRateAction,
  deleteTaxRateAction,
  setDefaultTaxRateAction,
  setTaxRateActiveAction,
  updateTaxRateAction,
} from "@/app/actions/tax-rates";
import { Button } from "@/components/ui/button";
import { Banner, Card, CardHeader } from "@/components/ui/card";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { Field, TextInput } from "@/components/ui/fields";
import { PercentField } from "@/components/ui/number-fields";
import { cn } from "@/lib/cn";
import { formatPercentBp } from "@/lib/money";
import type { TaxRate } from "@/lib/types";

export function TaxRatesManager({ rates }: { rates: TaxRate[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ name: string; rateBp: number | null }>({ name: "", rateBp: null });
  const [adding, setAdding] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function run(fn: () => Promise<{ ok: boolean; message?: string; errors?: Record<string, string> }>, after?: () => void) {
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) {
        setError(res.message ?? "No se pudo completar la operación.");
        setFieldErrors(res.errors ?? {});
        return;
      }
      setFieldErrors({});
      after?.();
      router.refresh();
    });
  }

  function startEdit(r: TaxRate) {
    setAdding(false);
    setEditing(r.id);
    setDraft({ name: r.name, rateBp: r.rateBp });
    setFieldErrors({});
  }

  const editor = (onSave: () => void, onCancel: () => void) => (
    <div className="grid gap-3 rounded-lg bg-slate-50 p-4 sm:grid-cols-[1fr_10rem_auto] sm:items-end">
      <Field label="Nombre" htmlFor="rate-name" error={fieldErrors.name}>
        <TextInput id="rate-name" value={draft.name} invalid={!!fieldErrors.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Ej.: IVA 7 %" />
      </Field>
      <Field label="Porcentaje" htmlFor="rate-bp" error={fieldErrors.rateBp}>
        <PercentField id="rate-bp" bp={draft.rateBp} invalid={!!fieldErrors.rateBp} onChange={(bp) => setDraft({ ...draft, rateBp: bp })} />
      </Field>
      <div className="flex gap-2">
        <Button size="md" onClick={onSave} disabled={pending}><Check className="h-4 w-4" aria-hidden /> Guardar</Button>
        <Button size="md" variant="secondary" onClick={onCancel}><X className="h-4 w-4" aria-hidden /> Cancelar</Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <Banner tone="warning">
        <p className="font-medium">ReformaPro no determina qué tipo de IVA corresponde a cada trabajo.</p>
        <p className="mt-1">
          Los tipos de esta lista solo se usan para calcular los importes. Antes de emitir un presupuesto,
          comprueba que se cumplen los requisitos del tipo que aplicas (consulta con tu asesor fiscal o con la
          Agencia Tributaria). Puedes usar tipos distintos en cada partida de un mismo presupuesto.
        </p>
      </Banner>

      {error && <Banner tone="error">{error}</Banner>}

      <Card>
        <CardHeader
          title="Tipos de IVA"
          description="El tipo predeterminado se propone al crear partidas nuevas. Puedes editarlos o añadir los tuyos."
          actions={
            !adding && (
              <Button variant="secondary" onClick={() => { setAdding(true); setEditing(null); setDraft({ name: "", rateBp: null }); setFieldErrors({}); }}>
                <Plus className="h-4 w-4" aria-hidden /> Añadir tipo
              </Button>
            )
          }
        />

        {adding && (
          <div className="mb-4">
            {editor(
              () => {
                const rateBp = draft.rateBp;
                run(
                  () => createTaxRateAction({ name: draft.name.trim() || (rateBp !== null ? `IVA ${formatPercentBp(rateBp)}` : ""), rateBp }),
                  () => setAdding(false),
                );
              },
              () => { setAdding(false); setFieldErrors({}); },
            )}
          </div>
        )}

        <ul className="divide-y divide-slate-100">
          {rates.map((r) => (
            <li key={r.id} className="py-3">
              {editing === r.id ? (
                editor(
                  () => run(() => updateTaxRateAction(r.id, draft), () => setEditing(null)),
                  () => { setEditing(null); setFieldErrors({}); },
                )
              ) : (
                <div className="flex flex-wrap items-center gap-3">
                  <div className={cn("min-w-0 flex-1", !r.isActive && "opacity-50")}>
                    <span className="font-medium text-slate-900">{r.name}</span>
                    <span className="ml-2 text-sm text-slate-500 tabular-nums">{formatPercentBp(r.rateBp)}</span>
                    {r.isDefault && (
                      <span className="ml-2 rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700 ring-1 ring-brand-200 ring-inset">Predeterminado</span>
                    )}
                    {!r.isActive && <span className="ml-2 text-xs text-slate-500">Inactivo</span>}
                  </div>
                  <div className="flex flex-wrap items-center gap-1">
                    {!r.isDefault && r.isActive && (
                      <Button variant="ghost" size="sm" disabled={pending} onClick={() => run(() => setDefaultTaxRateAction(r.id))}>Hacer predeterminado</Button>
                    )}
                    <Button variant="ghost" size="sm" disabled={pending} onClick={() => run(() => setTaxRateActiveAction(r.id, !r.isActive))}>
                      {r.isActive ? "Desactivar" : "Activar"}
                    </Button>
                    <Button variant="ghost" size="icon" aria-label={`Editar ${r.name}`} onClick={() => startEdit(r)}>
                      <Pencil className="h-4 w-4" aria-hidden />
                    </Button>
                    {!r.isDefault && (
                      <ConfirmButton
                        variant="ghost"
                        size="icon"
                        title="Eliminar tipo de IVA"
                        message={<>Se eliminará <strong>{r.name}</strong> de la lista. Los presupuestos ya creados conservan sus importes.</>}
                        onConfirm={async () => {
                          const res = await deleteTaxRateAction(r.id);
                          if (!res.ok) return res.message;
                          router.refresh();
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" aria-hidden />
                        <span className="sr-only">Eliminar {r.name}</span>
                      </ConfirmButton>
                    )}
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
