import { describe, expect, it } from "vitest";
import { DEFAULT_DATABASE_URL, resolveDatabaseConfig } from "@/server/db/client";

describe("configuración de la base de datos", () => {
  it("sin variables usa el archivo local", () => {
    expect(resolveDatabaseConfig({})).toEqual({ url: DEFAULT_DATABASE_URL, authToken: undefined });
  });

  it("usa DATABASE_URL y DATABASE_AUTH_TOKEN", () => {
    expect(
      resolveDatabaseConfig({ DATABASE_URL: " libsql://db.turso.io ", DATABASE_AUTH_TOKEN: "tok" }),
    ).toEqual({ url: "libsql://db.turso.io", authToken: "tok" });
  });

  it("acepta las variables de la integración de Turso en Vercel", () => {
    expect(
      resolveDatabaseConfig({ TURSO_DATABASE_URL: "libsql://x.turso.io", TURSO_AUTH_TOKEN: "t2", VERCEL: "1" }),
    ).toEqual({ url: "libsql://x.turso.io", authToken: "t2" });
  });

  it("DATABASE_URL tiene prioridad sobre TURSO_DATABASE_URL", () => {
    expect(
      resolveDatabaseConfig({ DATABASE_URL: "libsql://a.turso.io", TURSO_DATABASE_URL: "libsql://b.turso.io" }).url,
    ).toBe("libsql://a.turso.io");
  });

  it("en Vercel rechaza un archivo local con un mensaje claro", () => {
    expect(() => resolveDatabaseConfig({ VERCEL: "1" })).toThrow(/base de datos online/);
    expect(() => resolveDatabaseConfig({ VERCEL: "1", DATABASE_URL: "file:./x.db" })).toThrow(/Turso/);
  });

  it("fuera de Vercel el archivo local sigue permitido", () => {
    expect(resolveDatabaseConfig({ DATABASE_URL: "file:/app/data/r.db" }).url).toBe("file:/app/data/r.db");
  });
});
