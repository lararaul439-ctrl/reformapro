import { todayISO } from "@/lib/dates";
import { getDb } from "@/server/db/client";

export const dynamic = "force-dynamic";

const TABLES = [
  "company_settings",
  "tax_rates",
  "customers",
  "catalog_items",
  "quote_counters",
  "quotes",
  "quote_sections",
  "quote_lines",
  "quote_events",
] as const;

/** Copia de seguridad: todos los datos de la aplicación en un JSON. */
export async function GET() {
  const db = await getDb();
  const data: Record<string, unknown[]> = {};
  for (const table of TABLES) {
    const res = await db.execute(`SELECT * FROM ${table}`);
    data[table] = res.rows.map((r) => ({ ...r }));
  }
  const body = JSON.stringify(
    { app: "ReformaPro", format: 1, exportedAt: new Date().toISOString(), data },
    null,
    2,
  );
  return new Response(body, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="reformapro-copia-${todayISO()}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
