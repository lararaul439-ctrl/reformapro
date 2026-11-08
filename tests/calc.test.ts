import { describe, expect, it } from "vitest";
import {
  calcLine,
  calcQuote,
  markupBpFromCostAndPrice,
  marginOnSalesBpFromCostAndPrice,
  normalizeQuantity,
  priceFromCostAndMarkup,
  type CalcLineInput,
} from "@/lib/calc";

const line = (o: Partial<CalcLineInput> = {}): CalcLineInput => ({
  quantity: 1,
  unitCostCents: 0,
  unitPriceCents: 0,
  discountBp: 0,
  vatRateBp: 2100,
  ...o,
});

describe("calcLine", () => {
  it("cantidad decimal, descuento de partida", () => {
    // 12,5 m² × 24,80 € = 310,00 €; -10 % = 279,00 €
    const r = calcLine(line({ quantity: 12.5, unitPriceCents: 2480, discountBp: 1000 }));
    expect(r.grossCents).toBe(31000);
    expect(r.discountCents).toBe(3100);
    expect(r.netCents).toBe(27900);
  });
  it("redondea a céntimo (half away from zero)", () => {
    expect(calcLine(line({ quantity: 2.5, unitPriceCents: 33 })).netCents).toBe(83); // 82,5
    expect(calcLine(line({ quantity: 0.333, unitPriceCents: 100 })).netCents).toBe(33); // 33,3
    // 101 × 15 % = 15,15 -> 15
    const r = calcLine(line({ unitPriceCents: 101, discountBp: 1500 }));
    expect(r.discountCents).toBe(15);
    expect(r.netCents).toBe(86);
  });
  it("coste interno sin descuentos", () => {
    const r = calcLine(
      line({ quantity: 10, unitCostCents: 6000, unitPriceCents: 10000, discountBp: 1000 }),
    );
    expect(r.costCents).toBe(60000);
    expect(r.netCents).toBe(90000);
  });
  it("cantidad 0 y precio 0", () => {
    expect(calcLine(line({ quantity: 0, unitPriceCents: 5000 })).netCents).toBe(0);
    expect(calcLine(line({ quantity: 5, unitPriceCents: 0 })).netCents).toBe(0);
  });
  it("normalizeQuantity limita a 3 decimales", () => {
    expect(normalizeQuantity(1.23456)).toBe(1.235);
    expect(normalizeQuantity(2)).toBe(2);
  });
});

describe("calcQuote: IVA mixto", () => {
  const sections = [
    {
      lines: [
        line({ unitPriceCents: 100000, vatRateBp: 2100 }),
        line({ unitPriceCents: 50000, vatRateBp: 1000 }),
      ],
    },
    { lines: [line({ unitPriceCents: 20000, vatRateBp: 400 })] },
  ];

  it("desglosa base e IVA por tipo (21 %, 10 %, 4 %)", () => {
    const r = calcQuote({ sections, globalDiscountBp: 0 });
    expect(r.subtotalCents).toBe(170000);
    expect(r.taxableBaseCents).toBe(170000);
    expect(r.vat.map((v) => [v.vatRateBp, v.baseCents, v.vatCents])).toEqual([
      [2100, 100000, 21000],
      [1000, 50000, 5000],
      [400, 20000, 800],
    ]);
    expect(r.vatTotalCents).toBe(26800);
    expect(r.totalCents).toBe(196800);
    expect(r.sections.map((s) => s.subtotalCents)).toEqual([150000, 20000]);
  });

  it("tipos personalizados y 0 %", () => {
    const r = calcQuote({
      sections: [
        {
          lines: [
            line({ unitPriceCents: 10000, vatRateBp: 750 }), // 7,5 %
            line({ unitPriceCents: 10000, vatRateBp: 0 }),
          ],
        },
      ],
      globalDiscountBp: 0,
    });
    expect(r.vat.map((v) => [v.vatRateBp, v.vatCents])).toEqual([
      [750, 750],
      [0, 0],
    ]);
    expect(r.totalCents).toBe(20750);
  });

  it("agrupa partidas con el mismo tipo aunque estén en capítulos distintos", () => {
    const r = calcQuote({
      sections: [
        { lines: [line({ unitPriceCents: 1000, vatRateBp: 2100 })] },
        { lines: [line({ unitPriceCents: 2000, vatRateBp: 2100 })] },
      ],
      globalDiscountBp: 0,
    });
    expect(r.vat).toHaveLength(1);
    expect(r.vat[0].baseCents).toBe(3000);
    expect(r.vat[0].vatCents).toBe(630);
  });

  it("descuento global repartido por tipo de IVA", () => {
    const r = calcQuote({ sections, globalDiscountBp: 500 }); // 5 %
    expect(r.subtotalCents).toBe(170000);
    expect(r.globalDiscountCents).toBe(8500);
    expect(r.taxableBaseCents).toBe(161500);
    expect(r.vat.map((v) => [v.vatRateBp, v.baseCents, v.vatCents])).toEqual([
      [2100, 95000, 19950],
      [1000, 47500, 4750],
      [400, 19000, 760],
    ]);
    expect(r.vatTotalCents).toBe(25460);
    expect(r.totalCents).toBe(186960);
  });

  it("el descuento global redondeado por grupo sigue cuadrando", () => {
    // 3,33 € al 21 % y 3,33 € al 10 %, con 50 % de descuento: 1,665 -> 1,67 cada uno
    const r = calcQuote({
      sections: [
        {
          lines: [
            line({ unitPriceCents: 333, vatRateBp: 2100 }),
            line({ unitPriceCents: 333, vatRateBp: 1000 }),
          ],
        },
      ],
      globalDiscountBp: 5000,
    });
    expect(r.globalDiscountCents).toBe(334);
    expect(r.taxableBaseCents).toBe(332);
    expect(r.subtotalCents - r.globalDiscountCents).toBe(r.taxableBaseCents);
    expect(r.vat.map((v) => [v.baseCents, v.vatCents])).toEqual([
      [166, 35],
      [166, 17],
    ]);
    expect(r.totalCents).toBe(384);
  });

  it("combina descuento de partida + descuento global", () => {
    // 1.000,00 € -10 % = 900,00 €; -5 % global = 855,00 €; IVA 21 % = 179,55 €
    const r = calcQuote({
      sections: [{ lines: [line({ unitPriceCents: 100000, discountBp: 1000 })] }],
      globalDiscountBp: 500,
    });
    expect(r.subtotalCents).toBe(90000);
    expect(r.taxableBaseCents).toBe(85500);
    expect(r.vatTotalCents).toBe(17955);
    expect(r.totalCents).toBe(103455);
  });

  it("presupuesto vacío", () => {
    const r = calcQuote({ sections: [], globalDiscountBp: 0 });
    expect(r.totalCents).toBe(0);
    expect(r.vat).toEqual([]);
    expect(r.marginOnSalesBp).toBeNull();
    expect(r.markupOnCostBp).toBeNull();
  });
});

describe("márgenes", () => {
  it("beneficio, margen sobre venta y sobre coste", () => {
    const r = calcQuote({
      sections: [
        { lines: [line({ quantity: 10, unitCostCents: 6000, unitPriceCents: 10000 })] },
      ],
      globalDiscountBp: 0,
    });
    expect(r.costCents).toBe(60000);
    expect(r.profitCents).toBe(40000);
    expect(r.marginOnSalesBp).toBe(4000); // 40,00 %
    expect(r.markupOnCostBp).toBe(6667); // 66,67 %
  });

  it("los descuentos reducen el margen", () => {
    const r = calcQuote({
      sections: [
        {
          lines: [
            line({
              quantity: 10,
              unitCostCents: 6000,
              unitPriceCents: 10000,
              discountBp: 1000,
            }),
          ],
        },
      ],
      globalDiscountBp: 0,
    });
    expect(r.profitCents).toBe(30000);
    expect(r.marginOnSalesBp).toBe(3333);
    expect(r.markupOnCostBp).toBe(5000);
  });

  it("precio <-> margen sobre coste", () => {
    expect(priceFromCostAndMarkup(6000, 6667)).toBe(10000);
    expect(priceFromCostAndMarkup(1000, 2000)).toBe(1200);
    expect(markupBpFromCostAndPrice(6000, 10000)).toBe(6667);
    expect(markupBpFromCostAndPrice(0, 10000)).toBeNull();
    expect(marginOnSalesBpFromCostAndPrice(6000, 10000)).toBe(4000);
    expect(marginOnSalesBpFromCostAndPrice(6000, 0)).toBeNull();
  });
});

describe("invariantes (pruebas aleatorias con semilla fija)", () => {
  function rng(seed: number) {
    let s = seed;
    return () => {
      s = (s * 1664525 + 1013904223) % 4294967296;
      return s / 4294967296;
    };
  }

  it("total = base + IVA; suma de grupos = base; descuento global cuadra", () => {
    const rand = rng(42);
    const rates = [2100, 1000, 400, 0, 750];
    for (let i = 0; i < 300; i++) {
      const sections = Array.from({ length: 1 + Math.floor(rand() * 3) }, () => ({
        lines: Array.from({ length: 1 + Math.floor(rand() * 6) }, () =>
          line({
            quantity: Math.round(rand() * 50000) / 1000,
            unitCostCents: Math.floor(rand() * 20000),
            unitPriceCents: Math.floor(rand() * 40000),
            discountBp: Math.floor(rand() * 3000),
            vatRateBp: rates[Math.floor(rand() * rates.length)],
          }),
        ),
      }));
      const globalDiscountBp = Math.floor(rand() * 2500);
      const r = calcQuote({ sections, globalDiscountBp });

      const sumLineNets = r.sections.reduce(
        (a, s) => a + s.lines.reduce((b, l) => b + l.netCents, 0),
        0,
      );
      expect(r.subtotalCents).toBe(sumLineNets);
      expect(r.vat.reduce((a, v) => a + v.baseCents, 0)).toBe(r.taxableBaseCents);
      expect(r.vat.reduce((a, v) => a + v.grossBaseCents, 0)).toBe(r.subtotalCents);
      expect(r.vat.reduce((a, v) => a + v.globalDiscountCents, 0)).toBe(
        r.globalDiscountCents,
      );
      expect(r.taxableBaseCents).toBe(r.subtotalCents - r.globalDiscountCents);
      expect(r.vat.reduce((a, v) => a + v.vatCents, 0)).toBe(r.vatTotalCents);
      expect(r.totalCents).toBe(r.taxableBaseCents + r.vatTotalCents);
      expect(r.profitCents).toBe(r.taxableBaseCents - r.costCents);
      for (const v of r.vat) {
        expect(Number.isInteger(v.baseCents)).toBe(true);
        expect(Number.isInteger(v.vatCents)).toBe(true);
      }
    }
  });
});
