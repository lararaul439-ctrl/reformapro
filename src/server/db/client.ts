import { createClient, type Client } from "@libsql/client";
import fs from "node:fs";
import path from "node:path";
import { MIGRATIONS } from "./migrations";

export type Db = Client;

export const DEFAULT_DATABASE_URL = "file:./data/reformapro.db";

/**
 * Abre una base de datos libSQL y aplica las migraciones pendientes.
 *
 * - Local (por defecto): fichero SQLite en ./data/reformapro.db — sin servicios externos.
 * - Online: cualquier URL libSQL (p. ej. Turso, que tiene plan gratuito) con DATABASE_AUTH_TOKEN.
 */
export async function openDatabase(url: string, authToken?: string): Promise<Db> {
  if (url.startsWith("file:")) {
    const filePath = url.slice("file:".length);
    if (filePath && filePath !== ":memory:") {
      fs.mkdirSync(path.dirname(path.resolve(filePath)), { recursive: true });
    }
  }
  const db = createClient({ url, authToken: authToken || undefined });
  await migrate(db);
  return db;
}

export async function migrate(db: Db): Promise<void> {
  await db.execute(
    `CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL
    )`,
  );
  const applied = new Set(
    (await db.execute("SELECT version FROM schema_migrations")).rows.map((r) =>
      Number(r.version),
    ),
  );
  for (const m of MIGRATIONS) {
    if (applied.has(m.version)) continue;
    await db.batch(
      [
        ...m.statements,
        {
          sql: "INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)",
          args: [m.version, m.name, new Date().toISOString()],
        },
      ],
      "write",
    );
  }
}

// Singleton por proceso (sobrevive al hot-reload de desarrollo).
const globalForDb = globalThis as unknown as { __reformaproDb?: Promise<Db> };

export function getDb(): Promise<Db> {
  if (!globalForDb.__reformaproDb) {
    const url = process.env.DATABASE_URL?.trim() || DEFAULT_DATABASE_URL;
    globalForDb.__reformaproDb = openDatabase(url, process.env.DATABASE_AUTH_TOKEN).catch(
      (err) => {
        globalForDb.__reformaproDb = undefined; // permite reintentar
        throw err;
      },
    );
  }
  return globalForDb.__reformaproDb;
}
