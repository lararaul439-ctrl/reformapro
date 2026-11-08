/**
 * Validación de entradas (zod). Se usa en el servidor (obligatorio) y, cuando
 * conviene, también en el cliente para avisar antes de enviar.
 * Todos los mensajes están en español.
 */

import { z } from "zod";
import { isValidISODate } from "./dates";
import { QUOTE_STATUSES } from "./quote-status";
import { ITEM_TYPES } from "./units";

const text = (max: number) => z.string().trim().max(max, `Máximo ${max} caracteres`);
const optionalText = (max: number) => text(max).default("");
const email = z
  .string()
  .trim()
  .max(120)
  .refine((v) => v === "" || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v), "Correo electrónico no válido")
  .default("");
const postalCode = z
  .string()
  .trim()
  .refine((v) => v === "" || /^\d{5}$/.test(v), "El código postal debe tener 5 dígitos")
  .default("");
const bp = (max = 10_000) =>
  z
    .number("Introduce un número")
    .int()
    .min(0, "No puede ser negativo")
    .max(max, `No puede superar ${max / 100} %`);
const cents = z
  .number("Introduce un importe")
  .int()
  .min(0, "No puede ser negativo")
  .max(1_000_000_000, "Importe demasiado grande");
const isoDate = z.string().refine(isValidISODate, "Fecha no válida");

export const companySchema = z.object({
  legalName: optionalText(150),
  tradeName: optionalText(150),
  taxId: optionalText(20),
  address: optionalText(200),
  postalCode,
  city: optionalText(80),
  province: optionalText(60),
  phone: optionalText(30),
  email,
  website: optionalText(200),
  iban: z
    .string()
    .trim()
    .transform((v) => v.replace(/\s+/g, "").toUpperCase())
    .refine((v) => v === "" || /^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(v), "IBAN no válido")
    .default(""),
  logoDataUrl: z
    .string()
    .refine(
      (v) => v === "" || /^data:image\/(png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(v),
      "El logo debe ser una imagen PNG o JPG",
    )
    .refine((v) => v.length <= 700_000, "El logo es demasiado grande (máx. ~500 KB)")
    .default(""),
  accentColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Color no válido")
    .default("#1d4ed8"),
  quotePrefix: z
    .string()
    .trim()
    .max(10, "Máximo 10 caracteres")
    .regex(/^[A-Za-z0-9\-_/.]*$/, "Solo letras, números y - _ / .")
    .default("P-"),
  defaultValidityDays: z.number().int().min(1, "Mínimo 1 día").max(365, "Máximo 365 días"),
  defaultMarkupBp: bp(100_000),
  defaultPaymentTerms: optionalText(1000),
  defaultConditions: optionalText(4000),
});
export type CompanyInput = z.infer<typeof companySchema>;

export const taxRateSchema = z.object({
  name: text(60).min(1, "El nombre es obligatorio"),
  rateBp: bp(10_000),
});
export type TaxRateInput = z.infer<typeof taxRateSchema>;

export const customerSchema = z.object({
  kind: z.enum(["particular", "empresa"]),
  name: text(150).min(1, "El nombre o razón social es obligatorio"),
  taxId: optionalText(20),
  email,
  phone: optionalText(30),
  address: optionalText(200),
  postalCode,
  city: optionalText(80),
  province: optionalText(60),
  notes: optionalText(2000),
});
export type CustomerInput = z.infer<typeof customerSchema>;

export const catalogItemSchema = z.object({
  code: optionalText(40),
  name: text(200).min(1, "El nombre es obligatorio"),
  description: optionalText(2000),
  itemType: z.enum(ITEM_TYPES),
  category: optionalText(80),
  unit: text(20).min(1, "La unidad es obligatoria"),
  unitCostCents: cents,
  unitPriceCents: cents,
  vatRateBp: bp(10_000),
  isActive: z.boolean().default(true),
});
export type CatalogItemInput = z.infer<typeof catalogItemSchema>;

export const quoteLineSchema = z
  .object({
    catalogItemId: z.string().nullable().default(null),
    code: optionalText(40),
    description: text(2000).min(1, "La descripción es obligatoria"),
    unit: text(20).default("ud"),
    quantity: z
      .number("Introduce una cantidad")
      .min(0, "La cantidad no puede ser negativa")
      .max(1_000_000, "Cantidad demasiado grande"),
    unitCostCents: cents,
    unitPriceCents: cents,
    discountBp: bp(10_000),
    vatRateBp: bp(10_000),
  })
  .refine(
    // Mantiene los cálculos intermedios dentro del rango de enteros seguros.
    (l) => l.quantity * l.unitPriceCents <= 1e12,
    { message: "El importe de la partida es demasiado grande", path: ["unitPriceCents"] },
  );

export const quoteSectionSchema = z.object({
  title: optionalText(200),
  lines: z.array(quoteLineSchema).max(500, "Máximo 500 partidas por capítulo"),
});

export const quoteInputSchema = z.object({
  customerId: z.string().min(1, "Selecciona un cliente"),
  title: optionalText(200),
  workAddress: optionalText(300),
  issueDate: isoDate,
  validUntil: isoDate.nullable().default(null),
  globalDiscountBp: bp(10_000),
  introText: optionalText(3000),
  paymentTerms: optionalText(1000),
  conditions: optionalText(4000),
  internalNotes: optionalText(4000),
  sections: z.array(quoteSectionSchema).min(1, "Añade al menos un capítulo").max(100),
}).refine((q) => !q.validUntil || q.validUntil >= q.issueDate, {
  message: "La validez no puede ser anterior a la fecha de emisión",
  path: ["validUntil"],
});
export type QuoteInput = z.infer<typeof quoteInputSchema>;
export type QuoteLineInput = z.infer<typeof quoteLineSchema>;

export const quoteStatusSchema = z.enum(QUOTE_STATUSES);

/** Convierte un error de zod en { "ruta.del.campo": "mensaje" } (primer error de cada campo). */
export function flattenZodErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    if (!(key in out)) out[key] = issue.message;
  }
  return out;
}
