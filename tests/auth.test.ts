import { describe, expect, it } from "vitest";
import {
  SESSION_MAX_AGE_SECONDS,
  createSessionToken,
  safeEqual,
  safeNextPath,
  verifySessionToken,
} from "@/server/auth/session";

describe("sesión con contraseña única", () => {
  const NOW = Date.UTC(2026, 10, 8, 12, 0, 0);

  it("un token recién creado es válido con la misma contraseña", async () => {
    const token = await createSessionToken("secreto", NOW);
    expect(await verifySessionToken(token, "secreto", NOW + 1000)).toBe(true);
  });

  it("se rechaza con otra contraseña, manipulado, vacío o caducado", async () => {
    const token = await createSessionToken("secreto", NOW);
    expect(await verifySessionToken(token, "otra", NOW)).toBe(false);
    expect(await verifySessionToken(undefined, "secreto", NOW)).toBe(false);
    expect(await verifySessionToken("", "secreto", NOW)).toBe(false);
    expect(await verifySessionToken("abc", "secreto", NOW)).toBe(false);
    expect(await verifySessionToken(token, "", NOW)).toBe(false);

    const [exp, mac] = token.split(".");
    // Alargar la caducidad sin poder volver a firmar.
    expect(await verifySessionToken(`${Number(exp) + 99999}.${mac}`, "secreto", NOW)).toBe(false);
    // Firma alterada.
    expect(await verifySessionToken(`${exp}.${mac.slice(0, -1)}${mac.endsWith("0") ? "1" : "0"}`, "secreto", NOW)).toBe(false);

    const after = NOW + (SESSION_MAX_AGE_SECONDS + 5) * 1000;
    expect(await verifySessionToken(token, "secreto", after)).toBe(false);
  });

  it("safeEqual compara en exactitud", () => {
    expect(safeEqual("abc", "abc")).toBe(true);
    expect(safeEqual("abc", "abd")).toBe(false);
    expect(safeEqual("abc", "abcd")).toBe(false);
    expect(safeEqual("", "")).toBe(true);
  });

  it("solo permite redirigir a rutas internas", () => {
    expect(safeNextPath("/presupuestos/abc?x=1")).toBe("/presupuestos/abc?x=1");
    expect(safeNextPath("/")).toBe("/");
    expect(safeNextPath("//evil.com")).toBe("/");
    expect(safeNextPath("https://evil.com")).toBe("/");
    expect(safeNextPath("/\\evil.com")).toBe("/");
    expect(safeNextPath("/acceso?next=/x")).toBe("/");
    expect(safeNextPath("/a\r\nSet-Cookie: x=1")).toBe("/");
    expect(safeNextPath(undefined)).toBe("/");
    expect(safeNextPath(42)).toBe("/");
  });
});
