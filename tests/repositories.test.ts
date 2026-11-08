import fs from "node:fs";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { calcQuoteDetail } from "@/lib/quote-calc";
import { calcQuote } from "@/lib/calc";
import { openDatabase, type Db } from "@/server/db/client";
import { DomainError } from "@/server/errors";
import { getCompany, saveCompany } from "@/server/repositories/company";
import {
  createTaxRate, deleteTaxRate, listTaxRates, setDefaultTaxRate, setTaxRateActive, updateTaxRate,
} from "@/server/repositories/tax-rates";
import {
  createCustomer, deleteCustomer, getCustomer, listCustomers, updateCustomer,
} from "@/server/repositories/customers";
import {
  createCatalogItem, deleteCatalogItem, getCatalogItem, importStarterCatalog, listCatalogItems,
  updateCatalogItem,
} from "@/server/repositories/catalog";
import {
  createQuote, deleteQuote, duplicateQuote, getDashboardStats, getQuote, listQuoteEvents,
  listQuotes, setQuoteStatus, updateQuote,
} from "@/server/repositories/quotes";
import { openTempDb, sampleCustomer, sampleQuoteInput } from "./helpers";

let db: Db;
let file: string;
let url: string;

beforeEach(async () => {
  ({ db, file, url } = await openTempDb());
});
afterEach(() => {
  db.close();
  fs.rmSync(file, { force: true });
});

const company = {
  legalName: "Reformas Pérez S.L.", tradeName: "Reformas Pérez", taxId: "B12345674",
  address: "Av. de la Constitución 5", postalCode: "41001", city: "Sevilla", province: "Sevilla",
  phone: "955 000 000", email: "info@reformasperez.es", website: "reformasperez.es",
  iban: "ES9121000418450200051332", logoDataUrl: "", accentColor: "#0f766e",
  quotePrefix: "RP-", defaultValidityDays: 45, defaultMarkupBp: 2500,
  defaultPaymentTerms: "50 % / 50 %", defaultConditions: "Condiciones…",
};

describe("migraciones", () => {
  it("se aplican una vez y son idempotentes", async () => {
    const v1 = await db.execute("SELECT version FROM schema_migrations");
    expect(v1.rows.length).toBe(1);
    await openDatabase(url).then((d) => d.close());
    const v2 = await db.execute("SELECT version FROM schema_migrations");
    expect(v2.rows.length).toBe(1);
  });
  it("crea IVA 21/10/4 y la fila de empresa", async () => {
    const rates = await listTaxRates(db);
    expect(rates.map((r) => r.rateBp)).toEqual([2100, 1000, 400]);
    expect(rates.find((r) => r.isDefault)?.rateBp).toBe(2100);
    expect((await getCompany(db)).quotePrefix).toBe("P-");
  });
});

describe("empresa: persistencia real en disco", () => {
  it("los datos sobreviven al cerrar y reabrir la base de datos", async () => {
    await saveCompany(db, company);
    db.close();
    const reopened = await openDatabase(url);
    const c = await getCompany(reopened);
    expect(c).toMatchObject({ legalName: "Reformas Pérez S.L.", quotePrefix: "RP-", defaultValidityDays: 45 });
    reopened.close();
    db = await openDatabase(url); // para el afterEach
  });
});

describe("tipos de IVA", () => {
  it("crea tipos personalizados y no permite duplicados", async () => {
    await createTaxRate(db, { name: "IVA especial 7,5 %", rateBp: 750 });
    await expect(createTaxRate(db, { name: "Otro", rateBp: 750 })).rejects.toBeInstanceOf(DomainError);
    expect((await listTaxRates(db)).map((r) => r.rateBp)).toEqual([2100, 1000, 750, 400]);
  });
  it("edita, cambia el predeterminado y protege el predeterminado", async () => {
    await updateTaxRate(db, "iva-10", { name: "IVA reducido", rateBp: 1000 });
    await setDefaultTaxRate(db, "iva-10");
    expect((await listTaxRates(db)).find((r) => r.isDefault)?.id).toBe("iva-10");
    await expect(setTaxRateActive(db, "iva-10", false)).rejects.toThrow(/predeterminado/);
    await expect(deleteTaxRate(db, "iva-10")).rejects.toThrow(/predeterminado/);
    await setTaxRateActive(db, "iva-21", false);
    expect((await listTaxRates(db, { activeOnly: true })).map((r) => r.id)).toEqual(["iva-10", "iva-4"]);
    await deleteTaxRate(db, "iva-4");
    await expect(setDefaultTaxRate(db, "iva-21")).rejects.toThrow(/Activa/);
  });
});

describe("clientes", () => {
  it("CRUD y búsqueda sin acentos", async () => {
    const id = await createCustomer(db, sampleCustomer);
    expect((await getCustomer(db, id))?.name).toBe("María García Ñoño");
    expect((await listCustomers(db, { q: "garcia nono" })).length).toBe(1);
    expect((await listCustomers(db, { q: "zzz" })).length).toBe(0);
    await updateCustomer(db, id, { ...sampleCustomer, city: "Toledo" });
    expect((await getCustomer(db, id))?.city).toBe("Toledo");
    await deleteCustomer(db, id);
    expect(await getCustomer(db, id)).toBeNull();
  });
  it("no se puede borrar un cliente con presupuestos", async () => {
    const id = await createCustomer(db, sampleCustomer);
    await createQuote(db, sampleQuoteInput(id));
    await expect(deleteCustomer(db, id)).rejects.toThrow(/1 presupuesto/);
    expect((await listCustomers(db))[0]).toMatchObject({ quoteCount: 1 });
  });
});

describe("biblioteca", () => {
  const item = {
    code: "T-1", name: "Azulejo blanco", description: "", itemType: "material" as const,
    category: "Revestimientos", unit: "m²", unitCostCents: 1000, unitPriceCents: 1300,
    vatRateBp: 2100, isActive: true,
  };
  it("CRUD, filtros y desactivación", async () => {
    const id = await createCatalogItem(db, item);
    await updateCatalogItem(db, id, { ...item, unitPriceCents: 1400 });
    expect((await getCatalogItem(db, id))?.unitPriceCents).toBe(1400);
    await updateCatalogItem(db, id, { ...item, isActive: false });
    expect((await listCatalogItems(db)).length).toBe(0);
    expect((await listCatalogItems(db, { includeInactive: true })).length).toBe(1);
    expect((await listCatalogItems(db, { includeInactive: true, type: "servicio" })).length).toBe(0);
    await deleteCatalogItem(db, id);
    expect(await getCatalogItem(db, id)).toBeNull();
  });
  it("importa la biblioteca de ejemplo una sola vez", async () => {
    const first = await importStarterCatalog(db, { markupBp: 2000, vatRateBp: 2100 });
    expect(first.added).toBeGreaterThan(10);
    const second = await importStarterCatalog(db, { markupBp: 2000, vatRateBp: 2100 });
    expect(second.added).toBe(0);
    const mo = (await listCatalogItems(db)).find((i) => i.code === "MO-01")!;
    expect(mo.unitCostCents).toBe(2400);
    expect(mo.unitPriceCents).toBe(2880); // 24,00 + 20 %
  });
});

describe("presupuestos", () => {
  let customerId: string;
  beforeEach(async () => {
    customerId = await createCustomer(db, sampleCustomer);
  });

  it("numera correlativamente por año con el prefijo configurado", async () => {
    await saveCompany(db, company);
    const a = await createQuote(db, sampleQuoteInput(customerId));
    const b = await createQuote(db, sampleQuoteInput(customerId));
    const c = await createQuote(db, sampleQuoteInput(customerId, { issueDate: "2027-01-10", validUntil: null }));
    expect([a.number, b.number, c.number]).toEqual(["RP-2026-0001", "RP-2026-0002", "RP-2027-0001"]);
  });

  it("guarda y recupera capítulos, partidas e IVA mixto tras reabrir la base de datos", async () => {
    const input = sampleQuoteInput(customerId);
    const { id, number } = await createQuote(db, input);
    db.close();
    db = await openDatabase(url);

    const q = (await getQuote(db, id))!;
    expect(q.number).toBe(number);
    expect(q.status).toBe("borrador");
    expect(q.customer.name).toBe("María García Ñoño");
    expect(q.sections.map((s) => s.title)).toEqual(["Albañilería", "Fontanería"]);
    expect(q.sections[0].lines.map((l) => l.description)).toEqual(["Tabique de ladrillo", "Retirada de escombros"]);
    expect(q.sections[0].lines[0]).toMatchObject({ quantity: 12.5, discountBp: 1000, vatRateBp: 1000, unitPriceCents: 2520 });

    // 12,5 × 25,20 = 315,00 -10 % = 283,50 (10 %) · 3 × 45,60 = 136,80 (21 %) · 4 × 69,60 = 278,40 (4 %)
    const totals = calcQuoteDetail(q);
    expect(totals.subtotalCents).toBe(28350 + 13680 + 27840);
    expect(totals.vat.map((v) => v.vatRateBp)).toEqual([2100, 1000, 400]);
    // El total cacheado en la tabla coincide con el cálculo.
    const [summary] = await listQuotes(db, { today: "2026-11-08" });
    expect(summary.totalCents).toBe(totals.totalCents);
    expect(summary.customerName).toBe("María García Ñoño");
    // Verificación independiente del total: base 69870 - 5 % por grupo + IVA
    const expected = calcQuote({
      globalDiscountBp: 500,
      sections: [
        { lines: [
          { quantity: 12.5, unitCostCents: 0, unitPriceCents: 2520, discountBp: 1000, vatRateBp: 1000 },
          { quantity: 3, unitCostCents: 0, unitPriceCents: 4560, discountBp: 0, vatRateBp: 2100 } ] },
        { lines: [{ quantity: 4, unitCostCents: 0, unitPriceCents: 6960, discountBp: 0, vatRateBp: 400 }] },
      ],
    });
    expect(totals.totalCents).toBe(expected.totalCents);
  });

  it("al editar reemplaza las partidas, conserva el número y registra el evento", async () => {
    const { id, number } = await createQuote(db, sampleQuoteInput(customerId));
    const edited = sampleQuoteInput(customerId, {
      title: "Reforma de cocina",
      sections: [{ title: "", lines: [{
        catalogItemId: null, code: "", description: "Solo una partida", unit: "ud", quantity: 1,
        unitCostCents: 0, unitPriceCents: 10000, discountBp: 0, vatRateBp: 2100 }] }],
      globalDiscountBp: 0,
    });
    await updateQuote(db, id, edited);
    const q = (await getQuote(db, id))!;
    expect(q.number).toBe(number);
    expect(q.title).toBe("Reforma de cocina");
    expect(q.sections).toHaveLength(1);
    expect(q.sections[0].lines).toHaveLength(1);
    const lines = await db.execute("SELECT COUNT(*) AS c FROM quote_lines");
    expect(Number(lines.rows[0].c)).toBe(1); // sin partidas huérfanas
    const events = await listQuoteEvents(db, id);
    expect(events.map((e) => e.type)).toEqual(["editado", "creado"]);
    expect((await listQuotes(db, { today: "2026-11-08" }))[0].totalCents).toBe(12100);
  });

  it("estados, caducidad, duplicado y borrado", async () => {
    const { id, number } = await createQuote(db, sampleQuoteInput(customerId));
    await setQuoteStatus(db, id, "enviado");
    expect((await listQuotes(db, { today: "2026-11-20", status: "enviado" })).length).toBe(1);
    expect((await listQuotes(db, { today: "2026-12-09", status: "enviado" })).length).toBe(0);
    expect((await listQuotes(db, { today: "2026-12-09", status: "caducado" })).length).toBe(1);

    const stats = await getDashboardStats(db, "2026-12-09");
    expect(stats).toMatchObject({ expiredCount: 1, sentCount: 0, draftCount: 0 });

    await setQuoteStatus(db, id, "aceptado");
    expect((await getDashboardStats(db, "2026-12-09")).acceptedYearTotalCents).toBeGreaterThan(0);

    const copy = await duplicateQuote(db, id, { today: "2026-12-10", validityDays: 30 });
    expect(copy.number).not.toBe(number);
    const dup = (await getQuote(db, copy.id))!;
    expect(dup.status).toBe("borrador");
    expect(dup.issueDate).toBe("2026-12-10");
    expect(dup.validUntil).toBe("2027-01-09");
    expect(dup.sections[0].lines).toHaveLength(2);
    expect((await listQuoteEvents(db, copy.id))[0]).toMatchObject({ type: "duplicado", detail: `Copia de ${number}` });

    await deleteQuote(db, id);
    expect(await getQuote(db, id)).toBeNull();
    for (const t of ["quote_lines", "quote_sections", "quote_events"]) {
      const r = await db.execute(`SELECT COUNT(*) AS c FROM ${t} WHERE quote_id = '${id}'`);
      expect(Number(r.rows[0].c)).toBe(0);
    }
    expect(await getQuote(db, copy.id)).not.toBeNull();
  });

  it("búsqueda y filtros del historial", async () => {
    const other = await createCustomer(db, { ...sampleCustomer, name: "Obras Sur S.L.", kind: "empresa" });
    await createQuote(db, sampleQuoteInput(customerId, { issueDate: "2026-03-01", validUntil: null }));
    await createQuote(db, sampleQuoteInput(other, { title: "Nave industrial", issueDate: "2026-09-01", validUntil: null }));
    const today = "2026-11-08";
    expect((await listQuotes(db, { today, q: "nave" })).length).toBe(1);
    expect((await listQuotes(db, { today, q: "garcia" })).length).toBe(1);
    expect((await listQuotes(db, { today, customerId: other })).length).toBe(1);
    expect((await listQuotes(db, { today, from: "2026-06-01" })).length).toBe(1);
    expect((await listQuotes(db, { today, to: "2026-06-01" })).length).toBe(1);
    expect((await listQuotes(db, { today })).map((q) => q.issueDate)).toEqual(["2026-09-01", "2026-03-01"]);
  });

  it("congela los datos del cliente al guardar (la factura histórica no cambia)", async () => {
    const { id } = await createQuote(db, sampleQuoteInput(customerId));
    await updateCustomer(db, customerId, { ...sampleCustomer, address: "Nueva dirección 1" });
    expect((await getQuote(db, id))!.customer.address).toBe("C/ Mayor 12, 3ºB");
    await updateQuote(db, id, sampleQuoteInput(customerId));
    expect((await getQuote(db, id))!.customer.address).toBe("Nueva dirección 1");
  });

  it("si falla a mitad no queda nada a medias ni se consume número", async () => {
    const bad = sampleQuoteInput(customerId);
    (bad.sections[1].lines[0] as { description: unknown }).description = null; // viola NOT NULL
    await expect(createQuote(db, bad)).rejects.toThrow();
    expect((await listQuotes(db, { today: "2026-11-08" })).length).toBe(0);
    const orphan = await db.execute("SELECT COUNT(*) AS c FROM quote_sections");
    expect(Number(orphan.rows[0].c)).toBe(0);
    const ok = await createQuote(db, sampleQuoteInput(customerId));
    expect(ok.number).toBe("P-2026-0001");
  });

  it("rechaza un cliente inexistente", async () => {
    await expect(createQuote(db, sampleQuoteInput("no-existe"))).rejects.toBeInstanceOf(DomainError);
  });
});
