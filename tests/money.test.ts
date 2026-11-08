import { describe, expect, it } from "vitest";
import {
  divRound,
  eurosToCents,
  formatEUR,
  formatNumberEs,
  formatPercentBp,
  formatQuantity,
  parseDecimalEs,
  percentToBp,
  toInputString,
} from "@/lib/money";

const norm = (s: string) => s.replace(/ /g, " ");

describe("formatEUR (1.250,50 €)", () => {
  it("usa punto de millar, coma decimal y símbolo detrás", () => {
    expect(norm(formatEUR(125050))).toBe("1.250,50 €");
    expect(norm(formatEUR(0))).toBe("0,00 €");
    expect(norm(formatEUR(5))).toBe("0,05 €");
    expect(norm(formatEUR(99))).toBe("0,99 €");
    expect(norm(formatEUR(100000))).toBe("1.000,00 €");
    expect(norm(formatEUR(123456789))).toBe("1.234.567,89 €");
  });
  it("agrupa los millares también con 4 cifras (Intl es-ES no lo hace)", () => {
    expect(norm(formatEUR(125000))).toBe("1.250,00 €");
  });
  it("negativos y sin símbolo", () => {
    expect(norm(formatEUR(-125050))).toBe("-1.250,50 €");
    expect(formatEUR(125050, { symbol: false })).toBe("1.250,50");
    expect(norm(formatEUR(-0))).toBe("0,00 €");
  });
  it("usa espacio duro antes del símbolo", () => {
    expect(formatEUR(100)).toBe("1,00 €");
  });
});

describe("formatos auxiliares", () => {
  it("porcentajes", () => {
    expect(norm(formatPercentBp(2100))).toBe("21 %");
    expect(norm(formatPercentBp(1050))).toBe("10,5 %");
    expect(norm(formatPercentBp(0))).toBe("0 %");
    expect(norm(formatPercentBp(725))).toBe("7,25 %");
  });
  it("cantidades", () => {
    expect(formatQuantity(12.5)).toBe("12,5");
    expect(formatQuantity(1250)).toBe("1.250");
    expect(formatQuantity(0.125)).toBe("0,125");
    expect(formatQuantity(3)).toBe("3");
  });
  it("formatNumberEs respeta mínimos y máximos de decimales", () => {
    expect(formatNumberEs(1234.5, 2, 2)).toBe("1.234,50");
    expect(formatNumberEs(1234.5, 0, 3)).toBe("1.234,5");
    expect(formatNumberEs(-0.004, 2, 2)).toBe("0,00");
  });
});

describe("parseDecimalEs", () => {
  it.each([
    ["1.250,50", 1250.5],
    ["1250,50", 1250.5],
    ["1250.50", 1250.5],
    ["1250", 1250],
    ["1.250", 1250],
    ["1.250.000", 1250000],
    ["12,5", 12.5],
    ["12.5", 12.5],
    ["0,05", 0.05],
    [",5", 0.5],
    ["  21 % ", 21],
    ["1.250,50 €", 1250.5],
    ["-3,5", -3.5],
  ])("%s -> %s", (input, expected) => {
    expect(parseDecimalEs(input)).toBe(expected);
  });
  it.each(["", "abc", "1,2,3", "1..5", "12a", "1.2.3", "--1", ",", "."])(
    "rechaza %j",
    (input) => {
      expect(parseDecimalEs(input)).toBeNull();
    },
  );
});

describe("conversiones", () => {
  it("eurosToCents evita errores de coma flotante", () => {
    expect(eurosToCents(1.005)).toBe(101);
    expect(eurosToCents(19.99)).toBe(1999);
    expect(eurosToCents(0.1 + 0.2)).toBe(30);
    expect(eurosToCents(1250.5)).toBe(125050);
  });
  it("percentToBp", () => {
    expect(percentToBp(21)).toBe(2100);
    expect(percentToBp(7.25)).toBe(725);
  });
  it("divRound redondea half away from zero", () => {
    expect(divRound(5, 2)).toBe(3);
    expect(divRound(-5, 2)).toBe(-3);
    expect(divRound(4, 3)).toBe(1);
    expect(divRound(7, 3)).toBe(2);
    expect(divRound(0, 7)).toBe(0);
  });
  it("toInputString", () => {
    expect(toInputString(1250.5)).toBe("1250,5");
    expect(toInputString(12)).toBe("12");
    expect(toInputString(null)).toBe("");
  });
});

import { mulDivRound } from "@/lib/money";
describe("mulDivRound", () => {
  it("equivale a divRound en rango seguro", () => {
    expect(mulDivRound(33, 2500, 1000)).toBe(83); // 82,5
    expect(mulDivRound(-33, 2500, 1000)).toBe(-83);
  });
  it("no pierde precisión con productos enormes", () => {
    // 9e15 × 2100 / 10000 = 1,89e15 exactos
    expect(mulDivRound(9_000_000_000_000_000, 2100, 10_000)).toBe(1_890_000_000_000_000);
    expect(mulDivRound(-9_000_000_000_000_000, 2100, 10_000)).toBe(-1_890_000_000_000_000);
  });
});
