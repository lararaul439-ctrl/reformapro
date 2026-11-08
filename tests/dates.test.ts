import { describe, expect, it } from "vitest";
import {
  addDaysISO,
  formatDateEs,
  formatDateTimeEs,
  isValidISODate,
  parseDateEs,
  todayISO,
} from "@/lib/dates";

describe("fechas DD/MM/AAAA", () => {
  it("formatea ISO a español", () => {
    expect(formatDateEs("2026-11-08")).toBe("08/11/2026");
    expect(formatDateEs("2026-01-05")).toBe("05/01/2026");
    expect(formatDateEs("")).toBe("");
    expect(formatDateEs(null)).toBe("");
  });
  it("formatea marcas de tiempo en hora de España", () => {
    // 22:26 UTC en noviembre = 23:26 en Madrid (UTC+1)
    expect(formatDateEs("2026-11-08T22:26:00.000Z")).toBe("08/11/2026");
    expect(formatDateTimeEs("2026-11-08T22:26:00.000Z")).toBe("08/11/2026 23:26");
    // 23:30 UTC el 31/12 ya es 01/01 en Madrid
    expect(formatDateEs("2026-12-31T23:30:00.000Z")).toBe("01/01/2027");
  });
  it("interpreta entradas habituales", () => {
    expect(parseDateEs("8/11/2026")).toBe("2026-11-08");
    expect(parseDateEs("08-11-2026")).toBe("2026-11-08");
    expect(parseDateEs("08.11.26")).toBe("2026-11-08");
    expect(parseDateEs(" 29/02/2028 ")).toBe("2028-02-29"); // bisiesto
  });
  it("rechaza fechas inexistentes o mal formadas", () => {
    expect(parseDateEs("31/02/2026")).toBeNull();
    expect(parseDateEs("29/02/2027")).toBeNull();
    expect(parseDateEs("32/01/2026")).toBeNull();
    expect(parseDateEs("2026-11-08")).toBeNull();
    expect(parseDateEs("hola")).toBeNull();
    expect(parseDateEs("")).toBeNull();
  });
  it("valida ISO y suma días", () => {
    expect(isValidISODate("2026-02-29")).toBe(false);
    expect(isValidISODate("2028-02-29")).toBe(true);
    expect(addDaysISO("2026-11-08", 30)).toBe("2026-12-08");
    expect(addDaysISO("2026-12-20", 15)).toBe("2027-01-04");
  });
  it("todayISO usa la zona horaria de España", () => {
    expect(todayISO(new Date("2026-12-31T23:30:00Z"))).toBe("2027-01-01");
    expect(todayISO(new Date("2026-06-30T21:59:00Z"))).toBe("2026-06-30");
    expect(todayISO(new Date("2026-06-30T22:00:00Z"))).toBe("2026-07-01");
  });
});
