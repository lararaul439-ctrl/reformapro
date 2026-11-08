import type { Row } from "@libsql/client";
import type { TaxRate } from "@/lib/types";
import type { TaxRateInput } from "@/lib/schemas";
import type { Db } from "../db/client";
import { bool, inTransaction, newId, nowISO, num, str } from "../db/helpers";
import { DomainError } from "../errors";

function mapRate(r: Row): TaxRate {
  return {
    id: str(r, "id"),
    name: str(r, "name"),
    rateBp: num(r, "rate_bp"),
    isDefault: bool(r, "is_default"),
    isActive: bool(r, "is_active"),
    sortOrder: num(r, "sort_order"),
  };
}

export async function listTaxRates(
  db: Db,
  opts: { activeOnly?: boolean } = {},
): Promise<TaxRate[]> {
  const res = await db.execute(
    `SELECT * FROM tax_rates ${opts.activeOnly ? "WHERE is_active = 1" : ""}
     ORDER BY rate_bp DESC`,
  );
  return res.rows.map((r) => mapRate(r));
}

export async function getDefaultTaxRate(db: Db): Promise<TaxRate | null> {
  const res = await db.execute(
    "SELECT * FROM tax_rates WHERE is_default = 1 AND is_active = 1 LIMIT 1",
  );
  if (res.rows[0]) return mapRate(res.rows[0]);
  const any = await db.execute(
    "SELECT * FROM tax_rates WHERE is_active = 1 ORDER BY rate_bp DESC LIMIT 1",
  );
  return any.rows[0] ? mapRate(any.rows[0]) : null;
}

async function assertUniqueRate(db: Db, rateBp: number, exceptId?: string) {
  const res = await db.execute({
    sql: "SELECT id FROM tax_rates WHERE rate_bp = ? AND id <> ?",
    args: [rateBp, exceptId ?? ""],
  });
  if (res.rows.length > 0) {
    throw new DomainError("Ya existe un tipo de IVA con ese porcentaje.");
  }
}

export async function createTaxRate(db: Db, input: TaxRateInput): Promise<string> {
  await assertUniqueRate(db, input.rateBp);
  const id = newId();
  const max = await db.execute("SELECT COALESCE(MAX(sort_order), 0) AS m FROM tax_rates");
  await db.execute({
    sql: `INSERT INTO tax_rates (id, name, rate_bp, is_default, is_active, sort_order, created_at)
          VALUES (?, ?, ?, 0, 1, ?, ?)`,
    args: [id, input.name, input.rateBp, num(max.rows[0], "m") + 1, nowISO()],
  });
  return id;
}

export async function updateTaxRate(db: Db, id: string, input: TaxRateInput): Promise<void> {
  await assertUniqueRate(db, input.rateBp, id);
  const res = await db.execute({
    sql: "UPDATE tax_rates SET name = ?, rate_bp = ? WHERE id = ?",
    args: [input.name, input.rateBp, id],
  });
  if (res.rowsAffected === 0) throw new DomainError("El tipo de IVA no existe.");
}

export async function setTaxRateActive(db: Db, id: string, active: boolean): Promise<void> {
  const res = await db.execute({ sql: "SELECT * FROM tax_rates WHERE id = ?", args: [id] });
  if (!res.rows[0]) throw new DomainError("El tipo de IVA no existe.");
  const rate = mapRate(res.rows[0]);
  if (!active) {
    if (rate.isDefault) {
      throw new DomainError("No puedes desactivar el tipo predeterminado. Elige otro antes.");
    }
    const others = await db.execute({
      sql: "SELECT COUNT(*) AS c FROM tax_rates WHERE is_active = 1 AND id <> ?",
      args: [id],
    });
    if (num(others.rows[0], "c") === 0) {
      throw new DomainError("Debe quedar al menos un tipo de IVA activo.");
    }
  }
  await db.execute({
    sql: "UPDATE tax_rates SET is_active = ? WHERE id = ?",
    args: [active ? 1 : 0, id],
  });
}

export async function setDefaultTaxRate(db: Db, id: string): Promise<void> {
  const res = await db.execute({ sql: "SELECT * FROM tax_rates WHERE id = ?", args: [id] });
  if (!res.rows[0]) throw new DomainError("El tipo de IVA no existe.");
  if (!mapRate(res.rows[0]).isActive) {
    throw new DomainError("Activa el tipo de IVA antes de marcarlo como predeterminado.");
  }
  await inTransaction(db, async (tx) => {
    await tx.execute("UPDATE tax_rates SET is_default = 0");
    await tx.execute({ sql: "UPDATE tax_rates SET is_default = 1 WHERE id = ?", args: [id] });
  });
}

export async function deleteTaxRate(db: Db, id: string): Promise<void> {
  const res = await db.execute({ sql: "SELECT * FROM tax_rates WHERE id = ?", args: [id] });
  if (!res.rows[0]) return;
  const rate = mapRate(res.rows[0]);
  if (rate.isDefault) {
    throw new DomainError("No puedes eliminar el tipo predeterminado. Elige otro antes.");
  }
  const active = await db.execute({
    sql: "SELECT COUNT(*) AS c FROM tax_rates WHERE is_active = 1 AND id <> ?",
    args: [id],
  });
  if (rate.isActive && num(active.rows[0], "c") === 0) {
    throw new DomainError("Debe quedar al menos un tipo de IVA activo.");
  }
  // Los presupuestos y artículos guardan el porcentaje, no una referencia: borrar es seguro.
  await db.execute({ sql: "DELETE FROM tax_rates WHERE id = ?", args: [id] });
}
