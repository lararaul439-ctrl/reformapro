import type { CalcQuoteInput } from "@/lib/calc";
import { isValidISODate } from "@/lib/dates";
import type { CatalogItem, QuoteDetail } from "@/lib/types";

/** Estado del editor: los campos numéricos pueden ser null mientras se escribe. */
export interface EditorLine {
  key: string;
  catalogItemId: string | null;
  code: string;
  description: string;
  unit: string;
  quantity: number | null;
  unitCostCents: number | null;
  unitPriceCents: number | null;
  discountBp: number | null;
  vatRateBp: number;
}

export interface EditorSection {
  key: string;
  title: string;
  lines: EditorLine[];
}

export interface EditorState {
  customerId: string;
  title: string;
  workAddress: string;
  issueDate: string | null;
  validUntil: string | null;
  globalDiscountBp: number | null;
  introText: string;
  paymentTerms: string;
  conditions: string;
  internalNotes: string;
  sections: EditorSection[];
}

let counter = 0;
/** Clave única de cliente (no usa crypto.randomUUID: no existe en HTTP sin TLS). */
export function newKey(): string {
  counter += 1;
  return `k${counter}_${Math.random().toString(36).slice(2, 8)}`;
}

export function blankLine(vatRateBp: number): EditorLine {
  return {
    key: newKey(),
    catalogItemId: null,
    code: "",
    description: "",
    unit: "ud",
    quantity: 1,
    unitCostCents: 0,
    unitPriceCents: 0,
    discountBp: 0,
    vatRateBp,
  };
}

export function lineFromCatalog(item: CatalogItem): EditorLine {
  return {
    key: newKey(),
    catalogItemId: item.id,
    code: item.code,
    description: item.description ? `${item.name}\n${item.description}` : item.name,
    unit: item.unit,
    quantity: 1,
    unitCostCents: item.unitCostCents,
    unitPriceCents: item.unitPriceCents,
    discountBp: 0,
    vatRateBp: item.vatRateBp,
  };
}

export function blankSection(title = ""): EditorSection {
  return { key: newKey(), title, lines: [] };
}

export function quoteToEditorState(q: QuoteDetail): EditorState {
  return {
    customerId: q.customerId,
    title: q.title,
    workAddress: q.workAddress,
    issueDate: q.issueDate,
    validUntil: q.validUntil,
    globalDiscountBp: q.globalDiscountBp,
    introText: q.introText,
    paymentTerms: q.paymentTerms,
    conditions: q.conditions,
    internalNotes: q.internalNotes,
    sections: q.sections.map((s) => ({
      key: s.id,
      title: s.title,
      lines: s.lines.map((l) => ({
        key: l.id,
        catalogItemId: l.catalogItemId,
        code: l.code,
        description: l.description,
        unit: l.unit,
        quantity: l.quantity,
        unitCostCents: l.unitCostCents,
        unitPriceCents: l.unitPriceCents,
        discountBp: l.discountBp,
        vatRateBp: l.vatRateBp,
      })),
    })),
  };
}

export function toCalcInput(state: EditorState): CalcQuoteInput {
  return {
    globalDiscountBp: state.globalDiscountBp ?? 0,
    sections: state.sections.map((s) => ({
      lines: s.lines.map((l) => ({
        quantity: l.quantity ?? 0,
        unitCostCents: l.unitCostCents ?? 0,
        unitPriceCents: l.unitPriceCents ?? 0,
        discountBp: l.discountBp ?? 0,
        vatRateBp: l.vatRateBp,
      })),
    })),
  };
}

/** Errores evidentes antes de enviar (el servidor valida de nuevo todo). */
export function validateState(state: EditorState): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!state.customerId) errors.customerId = "Selecciona un cliente";
  if (!state.issueDate || !isValidISODate(state.issueDate)) errors.issueDate = "Fecha no válida";
  if (state.validUntil && state.issueDate && state.validUntil < state.issueDate) {
    errors.validUntil = "No puede ser anterior a la emisión";
  }
  if (state.globalDiscountBp === null) errors.globalDiscountBp = "Introduce un porcentaje";
  state.sections.forEach((s, si) =>
    s.lines.forEach((l, li) => {
      const p = `sections.${si}.lines.${li}`;
      if (!l.description.trim()) errors[`${p}.description`] = "Escribe una descripción";
      if (l.quantity === null) errors[`${p}.quantity`] = "Introduce una cantidad";
      if (l.unitPriceCents === null) errors[`${p}.unitPriceCents`] = "Introduce un precio";
      if (l.unitCostCents === null) errors[`${p}.unitCostCents`] = "Introduce un coste";
      if (l.discountBp === null) errors[`${p}.discountBp`] = "Introduce un descuento";
    }),
  );
  return errors;
}

export function toPayload(state: EditorState) {
  return {
    customerId: state.customerId,
    title: state.title,
    workAddress: state.workAddress,
    issueDate: state.issueDate,
    validUntil: state.validUntil,
    globalDiscountBp: state.globalDiscountBp,
    introText: state.introText,
    paymentTerms: state.paymentTerms,
    conditions: state.conditions,
    internalNotes: state.internalNotes,
    sections: state.sections.map((s) => ({
      title: s.title,
      lines: s.lines.map((l) => ({
        catalogItemId: l.catalogItemId,
        code: l.code,
        description: l.description,
        unit: l.unit,
        quantity: l.quantity,
        unitCostCents: l.unitCostCents,
        unitPriceCents: l.unitPriceCents,
        discountBp: l.discountBp,
        vatRateBp: l.vatRateBp,
      })),
    })),
  };
}
