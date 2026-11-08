/**
 * Motor de cálculo de presupuestos. Funciones PURAS, sin dependencias de
 * servidor: se usan igual en el navegador (cálculo en vivo) y en el servidor
 * (que siempre recalcula antes de guardar o generar el PDF).
 *
 * Convenciones:
 *  - Importes en céntimos enteros; porcentajes en puntos básicos (21 % = 2100).
 *  - Cantidad con hasta 3 decimales (se trabaja internamente en milésimas).
 *  - Redondeo: "half away from zero" a céntimo.
 *
 * Orden de cálculo (el habitual en presupuestos de obra):
 *  1. Importe de partida   = cantidad × precio unitario
 *  2. Descuento de partida = importe × dto. %           → neto de partida
 *  3. Subtotal             = suma de netos
 *  4. Descuento global     = se aplica a la base de CADA tipo de IVA por
 *                            separado (así el reparto entre tipos es exacto)
 *  5. IVA                  = por tipo, sobre la base imponible de ese tipo
 *  6. Total                = base imponible + IVA
 *
 * Márgenes (solo uso interno, nunca se muestran al cliente):
 *  - Margen sobre coste ("recargo"): (precio − coste) / coste
 *  - Margen sobre venta:             (precio − coste) / precio
 */

import { mulDivRound, roundInt } from "./money";

export const BP_100 = 10_000;

export interface CalcLineInput {
  /** Cantidad (hasta 3 decimales). */
  quantity: number;
  /** Coste interno por unidad, en céntimos. */
  unitCostCents: number;
  /** Precio de venta por unidad, antes de descuento e IVA, en céntimos. */
  unitPriceCents: number;
  /** Descuento de la partida, en puntos básicos (0–10000). */
  discountBp: number;
  /** Tipo de IVA de la partida, en puntos básicos (2100 = 21 %). */
  vatRateBp: number;
}

export interface CalcLineResult {
  /** cantidad × precio, antes de descuento. */
  grossCents: number;
  discountCents: number;
  /** Importe de la partida tras su descuento (base antes del dto. global). */
  netCents: number;
  /** cantidad × coste (uso interno). */
  costCents: number;
}

export interface CalcSectionInput {
  lines: CalcLineInput[];
}

export interface CalcQuoteInput {
  sections: CalcSectionInput[];
  /** Descuento global del presupuesto en puntos básicos (0–10000). */
  globalDiscountBp: number;
}

export interface VatBreakdownRow {
  vatRateBp: number;
  /** Suma de netos de partidas de este tipo, antes del dto. global. */
  grossBaseCents: number;
  globalDiscountCents: number;
  /** Base imponible de este tipo. */
  baseCents: number;
  vatCents: number;
  totalCents: number;
}

export interface CalcSectionResult {
  lines: CalcLineResult[];
  subtotalCents: number;
}

export interface CalcQuoteResult {
  sections: CalcSectionResult[];
  /** Suma de todos los netos de partida (antes del dto. global). */
  subtotalCents: number;
  globalDiscountCents: number;
  /** Base imponible total (subtotal − dto. global). */
  taxableBaseCents: number;
  vat: VatBreakdownRow[];
  vatTotalCents: number;
  totalCents: number;
  /** Coste interno total. */
  costCents: number;
  /** Beneficio = base imponible − coste. */
  profitCents: number;
  /** Beneficio / base imponible, en puntos básicos. null si la base es 0. */
  marginOnSalesBp: number | null;
  /** Beneficio / coste, en puntos básicos. null si el coste es 0. */
  markupOnCostBp: number | null;
}

/** Cantidad -> milésimas enteras (soporta hasta 3 decimales). */
export function quantityToMilli(quantity: number): number {
  return roundInt(quantity * 1000);
}

/** Limita la cantidad a 3 decimales. */
export function normalizeQuantity(quantity: number): number {
  return quantityToMilli(quantity) / 1000;
}

export function calcLine(line: CalcLineInput): CalcLineResult {
  const qtyMilli = quantityToMilli(line.quantity);
  const grossCents = mulDivRound(qtyMilli, line.unitPriceCents, 1000);
  const discountCents = mulDivRound(grossCents, line.discountBp, BP_100);
  const netCents = grossCents - discountCents;
  const costCents = mulDivRound(qtyMilli, line.unitCostCents, 1000);
  return { grossCents, discountCents, netCents, costCents };
}

export function calcQuote(input: CalcQuoteInput): CalcQuoteResult {
  const groups = new Map<number, number>(); // vatRateBp -> suma de netos
  let subtotalCents = 0;
  let costCents = 0;

  const sections: CalcSectionResult[] = input.sections.map((section) => {
    let sectionSubtotal = 0;
    const lines = section.lines.map((line) => {
      const r = calcLine(line);
      sectionSubtotal += r.netCents;
      costCents += r.costCents;
      groups.set(line.vatRateBp, (groups.get(line.vatRateBp) ?? 0) + r.netCents);
      return r;
    });
    subtotalCents += sectionSubtotal;
    return { lines, subtotalCents: sectionSubtotal };
  });

  let globalDiscountCents = 0;
  let vatTotalCents = 0;
  const vat: VatBreakdownRow[] = [...groups.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([vatRateBp, grossBaseCents]) => {
      const discount = mulDivRound(grossBaseCents, input.globalDiscountBp, BP_100);
      const baseCents = grossBaseCents - discount;
      const vatCents = mulDivRound(baseCents, vatRateBp, BP_100);
      globalDiscountCents += discount;
      vatTotalCents += vatCents;
      return {
        vatRateBp,
        grossBaseCents,
        globalDiscountCents: discount,
        baseCents,
        vatCents,
        totalCents: baseCents + vatCents,
      };
    });

  const taxableBaseCents = subtotalCents - globalDiscountCents;
  const profitCents = taxableBaseCents - costCents;

  return {
    sections,
    subtotalCents,
    globalDiscountCents,
    taxableBaseCents,
    vat,
    vatTotalCents,
    totalCents: taxableBaseCents + vatTotalCents,
    costCents,
    profitCents,
    marginOnSalesBp:
      taxableBaseCents !== 0 ? mulDivRound(profitCents, BP_100, taxableBaseCents) : null,
    markupOnCostBp: costCents > 0 ? mulDivRound(profitCents, BP_100, costCents) : null,
  };
}

/** Precio de venta a partir de coste y margen sobre coste (en bp). */
export function priceFromCostAndMarkup(costCents: number, markupBp: number): number {
  return mulDivRound(costCents, BP_100 + markupBp, BP_100);
}

/** Margen sobre coste (bp) a partir de coste y precio. null si no hay coste. */
export function markupBpFromCostAndPrice(
  costCents: number,
  priceCents: number,
): number | null {
  if (costCents <= 0) return null;
  return mulDivRound(priceCents - costCents, BP_100, costCents);
}

/** Margen sobre venta (bp) a partir de coste y precio. null si el precio es 0. */
export function marginOnSalesBpFromCostAndPrice(
  costCents: number,
  priceCents: number,
): number | null {
  if (priceCents <= 0) return null;
  return mulDivRound(priceCents - costCents, BP_100, priceCents);
}
