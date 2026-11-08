import type { Row } from "@libsql/client";
import type { Customer } from "@/lib/types";
import type { CustomerInput } from "@/lib/schemas";
import { matchesQuery } from "@/lib/search";
import type { Db } from "../db/client";
import { newId, nowISO, num, str } from "../db/helpers";
import { DomainError } from "../errors";

export interface CustomerListItem extends Customer {
  quoteCount: number;
  quotedTotalCents: number;
}

function mapCustomer(r: Row): Customer {
  return {
    id: str(r, "id"),
    kind: str(r, "kind") === "empresa" ? "empresa" : "particular",
    name: str(r, "name"),
    taxId: str(r, "tax_id"),
    email: str(r, "email"),
    phone: str(r, "phone"),
    address: str(r, "address"),
    postalCode: str(r, "postal_code"),
    city: str(r, "city"),
    province: str(r, "province"),
    notes: str(r, "notes"),
    createdAt: str(r, "created_at"),
    updatedAt: str(r, "updated_at"),
  };
}

export async function listCustomers(
  db: Db,
  opts: { q?: string } = {},
): Promise<CustomerListItem[]> {
  const res = await db.execute(
    `SELECT c.*, COUNT(q.id) AS quote_count, COALESCE(SUM(q.total_cents), 0) AS quoted_total
     FROM customers c LEFT JOIN quotes q ON q.customer_id = c.id
     GROUP BY c.id ORDER BY c.name COLLATE NOCASE`,
  );
  const items = res.rows.map((r) => ({
    ...mapCustomer(r),
    quoteCount: num(r, "quote_count"),
    quotedTotalCents: num(r, "quoted_total"),
  }));
  const q = opts.q?.trim();
  if (!q) return items;
  return items.filter((c) =>
    matchesQuery(q, c.name, c.taxId, c.email, c.phone, c.city, c.address),
  );
}

export async function getCustomer(db: Db, id: string): Promise<Customer | null> {
  const res = await db.execute({ sql: "SELECT * FROM customers WHERE id = ?", args: [id] });
  return res.rows[0] ? mapCustomer(res.rows[0]) : null;
}

export async function createCustomer(db: Db, input: CustomerInput): Promise<string> {
  const id = newId();
  const now = nowISO();
  await db.execute({
    sql: `INSERT INTO customers
      (id, kind, name, tax_id, email, phone, address, postal_code, city, province, notes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id, input.kind, input.name, input.taxId, input.email, input.phone, input.address,
      input.postalCode, input.city, input.province, input.notes, now, now,
    ],
  });
  return id;
}

export async function updateCustomer(db: Db, id: string, input: CustomerInput): Promise<void> {
  const res = await db.execute({
    sql: `UPDATE customers SET kind = ?, name = ?, tax_id = ?, email = ?, phone = ?, address = ?,
          postal_code = ?, city = ?, province = ?, notes = ?, updated_at = ? WHERE id = ?`,
    args: [
      input.kind, input.name, input.taxId, input.email, input.phone, input.address,
      input.postalCode, input.city, input.province, input.notes, nowISO(), id,
    ],
  });
  if (res.rowsAffected === 0) throw new DomainError("El cliente no existe.");
}

export async function deleteCustomer(db: Db, id: string): Promise<void> {
  const res = await db.execute({
    sql: "SELECT COUNT(*) AS c FROM quotes WHERE customer_id = ?",
    args: [id],
  });
  const count = num(res.rows[0], "c");
  if (count > 0) {
    throw new DomainError(
      `No se puede eliminar: el cliente tiene ${count} presupuesto${count === 1 ? "" : "s"} en el historial.`,
    );
  }
  await db.execute({ sql: "DELETE FROM customers WHERE id = ?", args: [id] });
}
