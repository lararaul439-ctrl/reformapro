"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, inputClass } from "@/components/ui/fields";
import { formatEUR, formatPercentBp } from "@/lib/money";
import { matchesQuery } from "@/lib/search";
import type { CatalogItem } from "@/lib/types";
import { ITEM_TYPES, ITEM_TYPE_LABELS } from "@/lib/units";

/** Diálogo para añadir partidas desde la biblioteca. Permite añadir varias seguidas. */
export function CatalogPicker({
  open,
  items,
  targetLabel,
  onAdd,
  onClose,
}: {
  open: boolean;
  items: CatalogItem[];
  targetLabel: string;
  onAdd: (item: CatalogItem) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [q, setQ] = useState("");
  const [type, setType] = useState("");
  const [added, setAdded] = useState<Record<string, number>>({});

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  const filtered = useMemo(
    () =>
      items.filter(
        (i) =>
          (!type || i.itemType === type) &&
          matchesQuery(q, i.code, i.name, i.description, i.category),
      ),
    [items, q, type],
  );

  return (
    <dialog
      ref={ref}
      onClose={() => {
        setAdded({});
        setQ("");
        onClose();
      }}
      className="m-auto h-[min(40rem,90vh)] w-[calc(100%-1.5rem)] max-w-2xl rounded-xl bg-white p-0 shadow-xl"
      aria-label="Añadir desde la biblioteca"
    >
      <div className="flex h-full flex-col">
        <div className="border-b border-slate-200 p-5">
          <h2 className="text-lg font-semibold text-slate-900">Añadir desde la biblioteca</h2>
          <p className="mt-0.5 text-sm text-slate-500">Se añadirán a: <strong>{targetLabel}</strong></p>
          <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
              <input
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar artículo…"
                aria-label="Buscar artículo"
                className={`${inputClass} pl-9`}
                autoFocus
              />
            </div>
            <Select value={type} onChange={(e) => setType(e.target.value)} aria-label="Tipo">
              <option value="">Todos los tipos</option>
              {ITEM_TYPES.map((t) => <option key={t} value={t}>{ITEM_TYPE_LABELS[t]}</option>)}
            </Select>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {items.length === 0 ? (
            <p className="p-8 text-center text-sm text-slate-500">
              La biblioteca está vacía. Crea artículos en la sección Biblioteca para poder añadirlos aquí.
            </p>
          ) : filtered.length === 0 ? (
            <p className="p-8 text-center text-sm text-slate-500">Ningún artículo coincide con la búsqueda.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {filtered.map((i) => (
                <li key={i.id} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-slate-900">{i.name}</div>
                    <div className="truncate text-xs text-slate-500">
                      {[i.code, i.category, ITEM_TYPE_LABELS[i.itemType]].filter(Boolean).join(" · ")}
                    </div>
                  </div>
                  <div className="text-right text-sm tabular-nums">
                    <div className="font-medium text-slate-900">{formatEUR(i.unitPriceCents)}<span className="text-slate-500"> / {i.unit}</span></div>
                    <div className="text-xs text-slate-500">IVA {formatPercentBp(i.vatRateBp)}</div>
                  </div>
                  <Button
                    size="sm"
                    variant={added[i.id] ? "secondary" : "primary"}
                    aria-label={`Añadir ${i.name}`}
                    onClick={() => {
                      onAdd(i);
                      setAdded((a) => ({ ...a, [i.id]: (a[i.id] ?? 0) + 1 }));
                    }}
                  >
                    <Plus className="h-4 w-4" aria-hidden />
                    {added[i.id] ? `Añadido ×${added[i.id]}` : "Añadir"}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-5 py-3">
          <span className="text-sm text-slate-500">
            {Object.values(added).reduce((a, b) => a + b, 0)} partida(s) añadida(s)
          </span>
          <Button variant="secondary" onClick={() => ref.current?.close()}>Listo</Button>
        </div>
      </div>
    </dialog>
  );
}
