import { calcQuote, type CalcQuoteInput, type CalcQuoteResult } from "./calc";
import type { QuoteDetail } from "./types";

/** Calcula los totales de un presupuesto completo (estructura guardada o en edición). */
export function calcQuoteDetail(
  q: Pick<QuoteDetail, "sections" | "globalDiscountBp">,
): CalcQuoteResult {
  const input: CalcQuoteInput = {
    globalDiscountBp: q.globalDiscountBp,
    sections: q.sections.map((s) => ({
      lines: s.lines.map((l) => ({
        quantity: l.quantity,
        unitCostCents: l.unitCostCents,
        unitPriceCents: l.unitPriceCents,
        discountBp: l.discountBp,
        vatRateBp: l.vatRateBp,
      })),
    })),
  };
  return calcQuote(input);
}
