/** Tipos de dominio compartidos entre servidor y cliente. */

import type { ItemType } from "./units";
import type { QuoteStatus } from "./quote-status";

export interface Company {
  legalName: string;
  tradeName: string;
  taxId: string;
  address: string;
  postalCode: string;
  city: string;
  province: string;
  phone: string;
  email: string;
  website: string;
  iban: string;
  /** Imagen en data URL (png/jpeg). Vacío si no hay logo. */
  logoDataUrl: string;
  accentColor: string;
  quotePrefix: string;
  defaultValidityDays: number;
  /** Margen sobre coste por defecto para nuevos artículos/partidas (bp). */
  defaultMarkupBp: number;
  defaultPaymentTerms: string;
  defaultConditions: string;
  updatedAt: string;
}

export interface TaxRate {
  id: string;
  name: string;
  /** Tipo en puntos básicos: 2100 = 21 %. */
  rateBp: number;
  isDefault: boolean;
  isActive: boolean;
  sortOrder: number;
}

export type CustomerKind = "particular" | "empresa";

export interface Customer {
  id: string;
  kind: CustomerKind;
  name: string;
  taxId: string;
  email: string;
  phone: string;
  address: string;
  postalCode: string;
  city: string;
  province: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface CatalogItem {
  id: string;
  code: string;
  name: string;
  description: string;
  itemType: ItemType;
  category: string;
  unit: string;
  unitCostCents: number;
  unitPriceCents: number;
  vatRateBp: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface QuoteLine {
  id: string;
  catalogItemId: string | null;
  code: string;
  description: string;
  unit: string;
  quantity: number;
  unitCostCents: number;
  unitPriceCents: number;
  discountBp: number;
  vatRateBp: number;
}

export interface QuoteSection {
  id: string;
  title: string;
  lines: QuoteLine[];
}

/** Datos del cliente tal y como estaban al guardar el presupuesto. */
export interface CustomerSnapshot {
  name: string;
  taxId: string;
  email: string;
  phone: string;
  address: string;
  postalCode: string;
  city: string;
  province: string;
}

export interface QuoteDetail {
  id: string;
  number: string;
  customerId: string;
  customer: CustomerSnapshot;
  title: string;
  workAddress: string;
  status: QuoteStatus;
  issueDate: string;
  validUntil: string | null;
  globalDiscountBp: number;
  introText: string;
  paymentTerms: string;
  conditions: string;
  internalNotes: string;
  sections: QuoteSection[];
  createdAt: string;
  updatedAt: string;
}

export interface QuoteSummary {
  id: string;
  number: string;
  customerId: string;
  customerName: string;
  title: string;
  status: QuoteStatus;
  issueDate: string;
  validUntil: string | null;
  totalCents: number;
  updatedAt: string;
}

export interface QuoteEvent {
  id: string;
  type: "creado" | "editado" | "estado" | "duplicado";
  detail: string;
  createdAt: string;
}
