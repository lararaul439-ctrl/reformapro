import type { ReactNode } from "react";
import type { CalcQuoteResult } from "@/lib/calc";
import { formatEUR, formatPercentBp } from "@/lib/money";
import { cn } from "@/lib/cn";

/** Desglose económico: subtotal, descuento global, base imponible, IVA por tipo y total. */
export function TotalsTable({
  calc,
  globalDiscountBp,
  discountControl,
  className,
}: {
  calc: CalcQuoteResult;
  globalDiscountBp: number;
  /** Si se indica, sustituye la etiqueta del descuento global (el editor muestra un campo). */
  discountControl?: ReactNode;
  className?: string;
}) {
  const showDiscount = discountControl || calc.globalDiscountCents > 0;
  return (
    <dl className={cn("space-y-2 text-sm", className)}>
      <Row label="Subtotal" value={formatEUR(calc.subtotalCents)} />
      {showDiscount && (
        <div className="flex items-center justify-between gap-3">
          <dt className="text-slate-600">
            {discountControl ?? `Descuento (${formatPercentBp(globalDiscountBp)})`}
          </dt>
          <dd className="tabular-nums text-slate-900">
            {calc.globalDiscountCents > 0 ? `−${formatEUR(calc.globalDiscountCents)}` : formatEUR(0)}
          </dd>
        </div>
      )}
      <Row label="Base imponible" value={formatEUR(calc.taxableBaseCents)} strong />
      {calc.vat.map((v) => (
        <Row
          key={v.vatRateBp}
          label={`IVA ${formatPercentBp(v.vatRateBp)} s/ ${formatEUR(v.baseCents)}`}
          value={formatEUR(v.vatCents)}
          muted
        />
      ))}
      {calc.vat.length > 1 && <Row label="Total IVA" value={formatEUR(calc.vatTotalCents)} />}
      <div className="flex items-baseline justify-between gap-3 border-t border-slate-200 pt-3">
        <dt className="text-base font-semibold text-slate-900">Total</dt>
        <dd className="text-xl font-bold tabular-nums text-slate-900">{formatEUR(calc.totalCents)}</dd>
      </div>
    </dl>
  );
}

function Row({ label, value, strong, muted }: { label: string; value: string; strong?: boolean; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className={cn(muted ? "text-slate-500" : "text-slate-600", strong && "font-medium text-slate-800")}>{label}</dt>
      <dd className={cn("tabular-nums", strong ? "font-semibold text-slate-900" : muted ? "text-slate-600" : "text-slate-900")}>{value}</dd>
    </div>
  );
}

/** Rentabilidad: SOLO uso interno (no aparece en el PDF ni en lo que ve el cliente). */
export function ProfitPanel({ calc, linesWithoutCost }: { calc: CalcQuoteResult; linesWithoutCost: number }) {
  return (
    <div>
      <dl className="space-y-2 text-sm">
        <Row label="Coste total" value={formatEUR(calc.costCents)} />
        <Row label="Beneficio" value={formatEUR(calc.profitCents)} strong />
        <Row label="Margen sobre venta" value={calc.marginOnSalesBp === null ? "—" : formatPercentBp(calc.marginOnSalesBp)} muted />
        <Row label="Margen sobre coste" value={calc.markupOnCostBp === null ? "—" : formatPercentBp(calc.markupOnCostBp)} muted />
      </dl>
      {linesWithoutCost > 0 && (
        <p className="mt-3 rounded-lg bg-amber-50 p-2.5 text-xs text-amber-900 ring-1 ring-amber-200 ring-inset">
          {linesWithoutCost === 1 ? "Hay 1 partida" : `Hay ${linesWithoutCost} partidas`} con precio pero sin coste: el
          beneficio mostrado puede ser mayor que el real.
        </p>
      )}
    </div>
  );
}
