import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createQuote, getQuote } from "@/server/repositories/quotes";
import { createCustomer } from "@/server/repositories/customers";
import { getCompany, saveCompany } from "@/server/repositories/company";
import { quotePdfFilename, renderQuotePdf, safeAccent } from "@/server/pdf/quote-pdf";
import { openTempDb, sampleCustomer, sampleQuoteInput } from "./helpers";
import type { QuoteInput } from "@/lib/schemas";

// PNG de 1×1 píxel (para probar el logo de empresa).
const TINY_PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

/** Extrae el texto con poppler (pdftotext) y normaliza espacios duros. */
function pdfText(pdf: Buffer): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "reformapro-pdf-"));
  const file = path.join(dir, "q.pdf");
  fs.writeFileSync(file, pdf);
  const out = execFileSync("pdftotext", ["-layout", file, "-"], { encoding: "utf8" });
  return out.replace(/ /g, " ");
}

async function setup(over: Partial<QuoteInput> = {}) {
  const { db } = await openTempDb();
  const company = await getCompany(db);
  await saveCompany(db, {
    legalName: "Reformas Pérez S.L.",
    tradeName: "Reformas Pérez",
    taxId: "B12345674",
    address: "Calle de la Obra 5",
    postalCode: "28001",
    city: "Madrid",
    province: "Madrid",
    phone: "910 000 000",
    email: "info@reformasperez.es",
    website: "",
    iban: "ES91 2100 0418 4502 0005 1332",
    logoDataUrl: "",
    accentColor: "#0f766e",
    quotePrefix: company.quotePrefix || "P",
    defaultValidityDays: 30,
    defaultMarkupBp: 2000,
    defaultPaymentTerms: "",
    defaultConditions: "",
  });
  const customerId = await createCustomer(db, sampleCustomer);
  const created = await createQuote(db, sampleQuoteInput(customerId, over));
  const quote = (await getQuote(db, created.id))!;
  return { db, quote, company: await getCompany(db) };
}

describe("generación de PDF", () => {
  it("produce un PDF válido con importes en formato español", async () => {
    const { quote, company } = await setup();
    const pdf = await renderQuotePdf(quote, company);

    expect(pdf.subarray(0, 5).toString("latin1")).toBe("%PDF-");
    expect(pdf.length).toBeGreaterThan(2_000);

    const text = pdfText(pdf);
    // Cálculo a mano del caso de ejemplo (ver calc.test.ts):
    // subtotal 698,70 · dto. 5 % repartido por grupo de IVA = 34,94 · base 663,76
    // IVA 10 % 26,93 + 21 % 27,29 + 4 % 10,58 = 64,80 · total 728,56
    expect(text).toContain("698,70 €");
    expect(text).toContain("34,94 €");
    expect(text).toContain("663,76 €");
    expect(text).toContain("269,32 €"); // base al 10 %
    expect(text).toContain("26,93 €");
    expect(text).toContain("27,29 €");
    expect(text).toContain("10,58 €");
    expect(text).toContain("64,80 €");
    expect(text).toContain("728,56 €");
  });

  it("muestra fechas DD/MM/AAAA, número, datos fiscales y tildes", async () => {
    const { quote, company } = await setup();
    const text = pdfText(await renderQuotePdf(quote, company));

    expect(text).toContain("08/11/2026");
    expect(text).toContain("08/12/2026");
    expect(text).not.toContain("2026-11-08");
    expect(text).toContain(quote.number);
    expect(text).toContain("PRESUPUESTO");
    expect(text).toContain("María García Ñoño");
    expect(text).toContain("Reformas Pérez");
    expect(text).toContain("B12345674");
    expect(text).toContain("Albañilería");
    expect(text).toContain("Fontanería");
    expect(text).toContain("m²");
    expect(text).toContain("IBAN: ES91 2100 0418 4502 0005 1332");
    expect(text).toContain("IVA 10 %");
    expect(text).toContain("IVA 21 %");
    expect(text).toContain("IVA 4 %");
  });

  it("no filtra costes, márgenes ni notas internas", async () => {
    const { quote, company } = await setup();
    const text = pdfText(await renderQuotePdf(quote, company));

    expect(text).not.toContain("Cliente exigente"); // nota interna
    expect(text).not.toMatch(/rentabilidad|margen|beneficio|coste/i);
    // Costes unitarios de las partidas de ejemplo: 21,00 / 38,00 / 58,00 €
    expect(text).not.toContain("21,00 €");
    expect(text).not.toContain("38,00 €");
    expect(text).not.toContain("58,00 €");
  });

  it("separador de miles: 1.250,50 € y totales por encima de 1.000", async () => {
    const { db } = await openTempDb();
    const customerId = await createCustomer(db, sampleCustomer);
    const created = await createQuote(
      db,
      sampleQuoteInput(customerId, {
        globalDiscountBp: 0,
        sections: [
          {
            title: "Cocina",
            lines: [
              {
                catalogItemId: null, code: "", description: "Instalación completa de cocina",
                unit: "ud", quantity: 1, unitCostCents: 90000, unitPriceCents: 125050,
                discountBp: 0, vatRateBp: 2100,
              },
            ],
          },
        ],
      }),
    );
    const quote = (await getQuote(db, created.id))!;
    const text = pdfText(await renderQuotePdf(quote, await getCompany(db)));
    // 1.250,50 + 21 % (262,605 → 262,61) = 1.513,11
    expect(text).toContain("1.250,50 €");
    expect(text).toContain("262,61 €");
    expect(text).toContain("1.513,11 €");
  });

  it("pagina presupuestos largos y repite número de página", async () => {
    const lines = Array.from({ length: 90 }, (_, i) => ({
      catalogItemId: null, code: `L-${i + 1}`, description: `Partida de prueba número ${i + 1}`,
      unit: "ud", quantity: 1, unitCostCents: 1000, unitPriceCents: 2000,
      discountBp: 0, vatRateBp: 2100,
    }));
    const { quote, company } = await setup({ sections: [{ title: "Largo", lines }], globalDiscountBp: 0 });
    const text = pdfText(await renderQuotePdf(quote, company));
    expect(text).toMatch(/Página 1 de [2-9]/);
    expect(text).toMatch(/Página 2 de [2-9]/);
    expect(text).toContain("Partida de prueba número 90");
    // 90 × 20,00 € = 1.800,00 € de base
    expect(text).toContain("1.800,00 €");
  });

  it("acepta logo PNG y ignora un logo o color inválidos", async () => {
    const { quote, company } = await setup();
    const withLogo = await renderQuotePdf(quote, { ...company, logoDataUrl: TINY_PNG });
    expect(withLogo.subarray(0, 5).toString("latin1")).toBe("%PDF-");

    const broken = await renderQuotePdf(quote, {
      ...company,
      logoDataUrl: "data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=",
      accentColor: "rojo; background:url(x)",
    });
    expect(broken.subarray(0, 5).toString("latin1")).toBe("%PDF-");
    expect(safeAccent("rojo")).toBe("#1d4ed8");
    expect(safeAccent("#0F766E")).toBe("#0F766E");
  });

  it("genera un PDF también sin descuento global ni IVA mixto", async () => {
    const { quote, company } = await setup({
      globalDiscountBp: 0,
      sections: [
        {
          title: "",
          lines: [
            {
              catalogItemId: null, code: "", description: "Pintura", unit: "m²", quantity: 10,
              unitCostCents: 500, unitPriceCents: 800, discountBp: 0, vatRateBp: 2100,
            },
          ],
        },
      ],
    });
    const text = pdfText(await renderQuotePdf(quote, company));
    expect(text).toContain("80,00 €");
    expect(text).toContain("16,80 €");
    expect(text).toContain("96,80 €");
    expect(text).not.toContain("Descuento");
  });

  it("nombre de archivo seguro", () => {
    expect(
      quotePdfFilename({ number: "P-2026-0001", customer: { name: "María García Ñoño / S.L." } as never }),
    ).toBe("Presupuesto-P-2026-0001-Maria-Garcia-Nono-S-L.pdf");
  });
});
