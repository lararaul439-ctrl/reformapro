import { describe, expect, it } from "vitest";
import { validateSpanishTaxId } from "@/lib/tax-id";

describe("validateSpanishTaxId", () => {
  it("DNI", () => {
    expect(validateSpanishTaxId("12345678Z")).toMatchObject({ valid: true, type: "DNI" });
    expect(validateSpanishTaxId("12.345.678-z")).toMatchObject({ valid: true, type: "DNI" });
    expect(validateSpanishTaxId("12345678A").valid).toBe(false);
  });
  it("NIE", () => {
    expect(validateSpanishTaxId("X1234567L")).toMatchObject({ valid: true, type: "NIE" });
    expect(validateSpanishTaxId("X1234567A").valid).toBe(false);
  });
  it("CIF", () => {
    expect(validateSpanishTaxId("A58818501")).toMatchObject({ valid: true, type: "CIF" });
    expect(validateSpanishTaxId("A58818502").valid).toBe(false);
    // Entidades que exigen letra de control (Q): Q2826000H
    expect(validateSpanishTaxId("Q2826000H")).toMatchObject({ valid: true, type: "CIF" });
  });
  it("rechaza basura", () => {
    expect(validateSpanishTaxId("").valid).toBe(false);
    expect(validateSpanishTaxId("ABC").valid).toBe(false);
    expect(validateSpanishTaxId("1234").valid).toBe(false);
  });
});
