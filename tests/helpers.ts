import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { openDatabase, type Db } from "@/server/db/client";
import type { QuoteInput } from "@/lib/schemas";

export function tempDbPath(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "reformapro-test-"));
  return path.join(dir, "test.db");
}

export async function openTempDb(file = tempDbPath()): Promise<{ db: Db; file: string; url: string }> {
  const url = `file:${file}`;
  return { db: await openDatabase(url), file, url };
}

export const sampleCustomer = {
  kind: "particular" as const,
  name: "María García Ñoño",
  taxId: "12345678Z",
  email: "maria@example.com",
  phone: "600 123 456",
  address: "C/ Mayor 12, 3ºB",
  postalCode: "28013",
  city: "Madrid",
  province: "Madrid",
  notes: "",
};

export function sampleQuoteInput(customerId: string, over: Partial<QuoteInput> = {}): QuoteInput {
  return {
    customerId,
    title: "Reforma integral de baño",
    workAddress: "C/ Mayor 12, 3ºB, Madrid",
    issueDate: "2026-11-08",
    validUntil: "2026-12-08",
    globalDiscountBp: 500,
    introText: "Según visita realizada.",
    paymentTerms: "40 % al inicio, 60 % al finalizar.",
    conditions: "Precios válidos 30 días.",
    internalNotes: "Cliente exigente",
    sections: [
      {
        title: "Albañilería",
        lines: [
          {
            catalogItemId: null, code: "ALB-01", description: "Tabique de ladrillo",
            unit: "m²", quantity: 12.5, unitCostCents: 2100, unitPriceCents: 2520,
            discountBp: 1000, vatRateBp: 1000,
          },
          {
            catalogItemId: null, code: "", description: "Retirada de escombros",
            unit: "m³", quantity: 3, unitCostCents: 3800, unitPriceCents: 4560,
            discountBp: 0, vatRateBp: 2100,
          },
        ],
      },
      {
        title: "Fontanería",
        lines: [
          {
            catalogItemId: null, code: "", description: "Punto de agua",
            unit: "ud", quantity: 4, unitCostCents: 5800, unitPriceCents: 6960,
            discountBp: 0, vatRateBp: 400,
          },
        ],
      },
    ],
    ...over,
  };
}
