import type { Row, Transaction } from "@libsql/client";
import { calcQuote, normalizeQuantity } from "@/lib/calc";
import { addDaysISO } from "@/lib/dates";
import { formatEUR } from "@/lib/money";
import type { QuoteInput } from "@/lib/schemas";
import { matchesQuery } from "@/lib/search";
import type { DisplayStatus, QuoteStatus } from "@/lib/quote-status";
import { STATUS_LABELS } from "@/lib/quote-status";
import type {
  CustomerSnapshot,
  QuoteDetail,
  QuoteEvent,
  QuoteLine,
  QuoteSection,
  QuoteSummary,
} from "@/lib/types";
import type { Db } from "../db/client";
import { inTransaction, newId, nowISO, num, str, strOrNull } from "../db/helpers";
import { DEFAULT_CONTEXT, type RequestContext } from "../context";
import { DomainError } from "../errors";

// ---------------------------------------------------------------------------
// Lectura
// ---------------------------------------------------------------------------

export interface QuoteFilters {
  status?: DisplayStatus;
  customerId?: string;
  /** Texto libre: número, cliente, título u obra. */
  q?: string;
  /** Rango de fecha de emisión (ISO, ambos inclusivos). */
  from?: string;
  to?: string;
  /** Fecha de hoy (ISO). Necesaria para distinguir "enviado" de "caducado". */
  today: string;
}

function mapSummary(r: Row): QuoteSummary {
  return {
    id: str(r, "id"),
    number: str(r, "number"),
    customerId: str(r, "customer_id"),
    customerName: str(r, "customer_name"),
    title: str(r, "title"),
    status: str(r, "status") as QuoteStatus,
    issueDate: str(r, "issue_date"),
    validUntil: strOrNull(r, "valid_until"),
    totalCents: num(r, "total_cents"),
    updatedAt: str(r, "updated_at"),
  };
}

export async function listQuotes(db: Db, filters: QuoteFilters): Promise<QuoteSummary[]> {
  const where: string[] = [];
  const args: (string | number)[] = [];

  if (filters.status === "caducado") {
    where.push("q.status = 'enviado' AND q.valid_until IS NOT NULL AND q.valid_until < ?");
    args.push(filters.today);
  } else if (filters.status === "enviado") {
    where.push("q.status = 'enviado' AND (q.valid_until IS NULL OR q.valid_until >= ?)");
    args.push(filters.today);
  } else if (filters.status) {
    where.push("q.status = ?");
    args.push(filters.status);
  }
  if (filters.customerId) {
    where.push("q.customer_id = ?");
    args.push(filters.customerId);
  }
  if (filters.from) {
    where.push("q.issue_date >= ?");
    args.push(filters.from);
  }
  if (filters.to) {
    where.push("q.issue_date <= ?");
    args.push(filters.to);
  }

  const res = await db.execute({
    sql: `SELECT q.*, c.name AS customer_name
          FROM quotes q JOIN customers c ON c.id = q.customer_id
          ${where.length ? "WHERE " + where.join(" AND ") : ""}
          ORDER BY q.issue_date DESC, q.number DESC`,
    args,
  });
  const items = res.rows.map(mapSummary);
  const q = filters.q?.trim();
  if (!q) return items;
  // Para buscar también por obra, necesitamos ese campo.
  const works = new Map(res.rows.map((r) => [str(r, "id"), str(r, "work_address")]));
  return items.filter((i) =>
    matchesQuery(q, i.number, i.customerName, i.title, works.get(i.id) ?? ""),
  );
}

function parseSnapshot(raw: string): CustomerSnapshot {
  let data: Partial<CustomerSnapshot> = {};
  try {
    data = JSON.parse(raw) as Partial<CustomerSnapshot>;
  } catch {
    /* snapshot vacío */
  }
  return {
    name: data.name ?? "",
    taxId: data.taxId ?? "",
    email: data.email ?? "",
    phone: data.phone ?? "",
    address: data.address ?? "",
    postalCode: data.postalCode ?? "",
    city: data.city ?? "",
    province: data.province ?? "",
  };
}

export async function getQuote(db: Db, id: string): Promise<QuoteDetail | null> {
  const res = await db.execute({ sql: "SELECT * FROM quotes WHERE id = ?", args: [id] });
  const r = res.rows[0];
  if (!r) return null;

  const [secRes, lineRes] = await Promise.all([
    db.execute({
      sql: "SELECT * FROM quote_sections WHERE quote_id = ? ORDER BY position",
      args: [id],
    }),
    db.execute({
      sql: "SELECT * FROM quote_lines WHERE quote_id = ? ORDER BY position",
      args: [id],
    }),
  ]);

  const linesBySection = new Map<string, QuoteLine[]>();
  for (const l of lineRes.rows) {
    const line: QuoteLine = {
      id: str(l, "id"),
      catalogItemId: strOrNull(l, "catalog_item_id"),
      code: str(l, "code"),
      description: str(l, "description"),
      unit: str(l, "unit"),
      quantity: num(l, "quantity"),
      unitCostCents: num(l, "unit_cost_cents"),
      unitPriceCents: num(l, "unit_price_cents"),
      discountBp: num(l, "discount_bp"),
      vatRateBp: num(l, "vat_rate_bp"),
    };
    const key = str(l, "section_id");
    const list = linesBySection.get(key) ?? [];
    list.push(line);
    linesBySection.set(key, list);
  }
  const sections: QuoteSection[] = secRes.rows.map((s) => ({
    id: str(s, "id"),
    title: str(s, "title"),
    lines: linesBySection.get(str(s, "id")) ?? [],
  }));

  return {
    id: str(r, "id"),
    number: str(r, "number"),
    customerId: str(r, "customer_id"),
    customer: parseSnapshot(str(r, "customer_snapshot")),
    title: str(r, "title"),
    workAddress: str(r, "work_address"),
    status: str(r, "status") as QuoteStatus,
    issueDate: str(r, "issue_date"),
    validUntil: strOrNull(r, "valid_until"),
    globalDiscountBp: num(r, "global_discount_bp"),
    introText: str(r, "intro_text"),
    paymentTerms: str(r, "payment_terms"),
    conditions: str(r, "conditions"),
    internalNotes: str(r, "internal_notes"),
    sections,
    createdAt: str(r, "created_at"),
    updatedAt: str(r, "updated_at"),
  };
}

export async function listQuoteEvents(db: Db, quoteId: string): Promise<QuoteEvent[]> {
  const res = await db.execute({
    sql: "SELECT * FROM quote_events WHERE quote_id = ? ORDER BY created_at DESC, rowid DESC",
    args: [quoteId],
  });
  return res.rows.map((r) => ({
    id: str(r, "id"),
    type: str(r, "type") as QuoteEvent["type"],
    detail: str(r, "detail"),
    createdAt: str(r, "created_at"),
  }));
}

// ---------------------------------------------------------------------------
// Escritura
// ---------------------------------------------------------------------------

function computeTotals(input: QuoteInput) {
  return calcQuote({
    globalDiscountBp: input.globalDiscountBp,
    sections: input.sections.map((s) => ({
      lines: s.lines.map((l) => ({
        quantity: normalizeQuantity(l.quantity),
        unitCostCents: l.unitCostCents,
        unitPriceCents: l.unitPriceCents,
        discountBp: l.discountBp,
        vatRateBp: l.vatRateBp,
      })),
    })),
  });
}

async function loadSnapshot(tx: Transaction, customerId: string): Promise<string> {
  const res = await tx.execute({ sql: "SELECT * FROM customers WHERE id = ?", args: [customerId] });
  const c = res.rows[0];
  if (!c) throw new DomainError("El cliente seleccionado ya no existe.");
  const snapshot: CustomerSnapshot = {
    name: str(c, "name"),
    taxId: str(c, "tax_id"),
    email: str(c, "email"),
    phone: str(c, "phone"),
    address: str(c, "address"),
    postalCode: str(c, "postal_code"),
    city: str(c, "city"),
    province: str(c, "province"),
  };
  return JSON.stringify(snapshot);
}

async function writeBody(tx: Transaction, quoteId: string, input: QuoteInput): Promise<void> {
  let linePosition = 0;
  for (const [sIdx, section] of input.sections.entries()) {
    const sectionId = newId();
    await tx.execute({
      sql: "INSERT INTO quote_sections (id, quote_id, title, position) VALUES (?, ?, ?, ?)",
      args: [sectionId, quoteId, section.title, sIdx],
    });
    for (const l of section.lines) {
      await tx.execute({
        sql: `INSERT INTO quote_lines
          (id, quote_id, section_id, position, catalog_item_id, code, description, unit, quantity,
           unit_cost_cents, unit_price_cents, discount_bp, vat_rate_bp)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          newId(), quoteId, sectionId, linePosition++, l.catalogItemId, l.code, l.description,
          l.unit || "ud", normalizeQuantity(l.quantity), l.unitCostCents, l.unitPriceCents,
          l.discountBp, l.vatRateBp,
        ],
      });
    }
  }
}

async function addEvent(
  tx: Transaction,
  quoteId: string,
  type: QuoteEvent["type"],
  detail = "",
): Promise<void> {
  await tx.execute({
    sql: "INSERT INTO quote_events (id, quote_id, type, detail, created_at) VALUES (?, ?, ?, ?, ?)",
    args: [newId(), quoteId, type, detail, nowISO()],
  });
}

/** Siguiente número correlativo del año: `${prefijo}${año}-${0001}`. Atómico. */
async function nextNumber(tx: Transaction, issueDate: string): Promise<string> {
  const year = Number(issueDate.slice(0, 4));
  const prefixRes = await tx.execute("SELECT quote_prefix FROM company_settings WHERE id = 1");
  const prefix = prefixRes.rows[0] ? str(prefixRes.rows[0], "quote_prefix") : "P-";
  const seqRes = await tx.execute({
    sql: `INSERT INTO quote_counters (year, last_seq) VALUES (?, 1)
          ON CONFLICT(year) DO UPDATE SET last_seq = last_seq + 1
          RETURNING last_seq`,
    args: [year],
  });
  const seq = num(seqRes.rows[0], "last_seq");
  return `${prefix}${year}-${String(seq).padStart(4, "0")}`;
}

export async function createQuote(
  db: Db,
  input: QuoteInput,
  ctx: RequestContext = DEFAULT_CONTEXT,
  eventDetail = "",
): Promise<{ id: string; number: string }> {
  return inTransaction(db, async (tx) => {
    const snapshot = await loadSnapshot(tx, input.customerId);
    const number = await nextNumber(tx, input.issueDate);
    const totals = computeTotals(input);
    const id = newId();
    const now = nowISO();
    await tx.execute({
      sql: `INSERT INTO quotes
        (id, number, customer_id, customer_snapshot, title, work_address, status, issue_date,
         valid_until, global_discount_bp, intro_text, payment_terms, conditions, internal_notes,
         subtotal_cents, taxable_base_cents, vat_cents, total_cents, created_by, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, 'borrador', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        id, number, input.customerId, snapshot, input.title, input.workAddress, input.issueDate,
        input.validUntil, input.globalDiscountBp, input.introText, input.paymentTerms,
        input.conditions, input.internalNotes, totals.subtotalCents, totals.taxableBaseCents,
        totals.vatTotalCents, totals.totalCents, ctx.userId, now, now,
      ],
    });
    await writeBody(tx, id, input);
    await addEvent(tx, id, eventDetail ? "duplicado" : "creado", eventDetail);
    return { id, number };
  });
}

export async function updateQuote(
  db: Db,
  id: string,
  input: QuoteInput,
): Promise<{ number: string }> {
  return inTransaction(db, async (tx) => {
    const existing = await tx.execute({ sql: "SELECT number FROM quotes WHERE id = ?", args: [id] });
    if (!existing.rows[0]) throw new DomainError("El presupuesto no existe.");
    const snapshot = await loadSnapshot(tx, input.customerId);
    const totals = computeTotals(input);

    await tx.execute({ sql: "DELETE FROM quote_lines WHERE quote_id = ?", args: [id] });
    await tx.execute({ sql: "DELETE FROM quote_sections WHERE quote_id = ?", args: [id] });
    await tx.execute({
      sql: `UPDATE quotes SET customer_id = ?, customer_snapshot = ?, title = ?, work_address = ?,
        issue_date = ?, valid_until = ?, global_discount_bp = ?, intro_text = ?, payment_terms = ?,
        conditions = ?, internal_notes = ?, subtotal_cents = ?, taxable_base_cents = ?,
        vat_cents = ?, total_cents = ?, updated_at = ? WHERE id = ?`,
      args: [
        input.customerId, snapshot, input.title, input.workAddress, input.issueDate,
        input.validUntil, input.globalDiscountBp, input.introText, input.paymentTerms,
        input.conditions, input.internalNotes, totals.subtotalCents, totals.taxableBaseCents,
        totals.vatTotalCents, totals.totalCents, nowISO(), id,
      ],
    });
    await writeBody(tx, id, input);
    await addEvent(tx, id, "editado", `Total: ${formatEUR(totals.totalCents)}`);
    return { number: str(existing.rows[0], "number") };
  });
}

export async function setQuoteStatus(db: Db, id: string, status: QuoteStatus): Promise<void> {
  await inTransaction(db, async (tx) => {
    const res = await tx.execute({ sql: "SELECT status FROM quotes WHERE id = ?", args: [id] });
    if (!res.rows[0]) throw new DomainError("El presupuesto no existe.");
    const previous = str(res.rows[0], "status") as QuoteStatus;
    if (previous === status) return;
    await tx.execute({
      sql: "UPDATE quotes SET status = ?, updated_at = ? WHERE id = ?",
      args: [status, nowISO(), id],
    });
    await addEvent(tx, id, "estado", `${STATUS_LABELS[previous]} → ${STATUS_LABELS[status]}`);
  });
}

export async function deleteQuote(db: Db, id: string): Promise<void> {
  await inTransaction(db, async (tx) => {
    // Borrado explícito (no dependemos de que las claves foráneas estén activas).
    await tx.execute({ sql: "DELETE FROM quote_events WHERE quote_id = ?", args: [id] });
    await tx.execute({ sql: "DELETE FROM quote_lines WHERE quote_id = ?", args: [id] });
    await tx.execute({ sql: "DELETE FROM quote_sections WHERE quote_id = ?", args: [id] });
    await tx.execute({ sql: "DELETE FROM quotes WHERE id = ?", args: [id] });
  });
}

/** Crea una copia en borrador, con número nuevo, fecha de hoy y validez por defecto. */
export async function duplicateQuote(
  db: Db,
  id: string,
  opts: { today: string; validityDays: number },
  ctx: RequestContext = DEFAULT_CONTEXT,
): Promise<{ id: string; number: string }> {
  const source = await getQuote(db, id);
  if (!source) throw new DomainError("El presupuesto no existe.");
  const input: QuoteInput = {
    customerId: source.customerId,
    title: source.title,
    workAddress: source.workAddress,
    issueDate: opts.today,
    validUntil: addDaysISO(opts.today, opts.validityDays),
    globalDiscountBp: source.globalDiscountBp,
    introText: source.introText,
    paymentTerms: source.paymentTerms,
    conditions: source.conditions,
    internalNotes: source.internalNotes,
    sections: source.sections.map((s) => ({
      title: s.title,
      lines: s.lines.map((l) => ({
        catalogItemId: l.catalogItemId,
        code: l.code,
        description: l.description,
        unit: l.unit,
        quantity: l.quantity,
        unitCostCents: l.unitCostCents,
        unitPriceCents: l.unitPriceCents,
        discountBp: l.discountBp,
        vatRateBp: l.vatRateBp,
      })),
    })),
  };
  return createQuote(db, input, ctx, `Copia de ${source.number}`);
}

// ---------------------------------------------------------------------------
// Panel
// ---------------------------------------------------------------------------

export interface DashboardStats {
  draftCount: number;
  sentCount: number;
  expiredCount: number;
  acceptedCount: number;
  rejectedCount: number;
  /** Importe total (con IVA) de presupuestos enviados y vigentes. */
  openTotalCents: number;
  /** Importe total (con IVA) aceptado con fecha de emisión en el año actual. */
  acceptedYearTotalCents: number;
  recent: QuoteSummary[];
}

export async function getDashboardStats(
  db: Db,
  today: string,
): Promise<DashboardStats> {
  const year = today.slice(0, 4);
  const [byStatus, accepted, recent] = await Promise.all([
    db.execute({
      sql: `SELECT
              CASE WHEN status = 'enviado' AND valid_until IS NOT NULL AND valid_until < ?
                   THEN 'caducado' ELSE status END AS st,
              COUNT(*) AS c, COALESCE(SUM(total_cents), 0) AS t
            FROM quotes GROUP BY st`,
      args: [today],
    }),
    db.execute({
      sql: `SELECT COALESCE(SUM(total_cents), 0) AS t FROM quotes
            WHERE status = 'aceptado' AND substr(issue_date, 1, 4) = ?`,
      args: [year],
    }),
    listQuotes(db, { today }).then((all) => all.slice(0, 6)),
  ]);

  const find = (st: string) => byStatus.rows.find((r) => str(r, "st") === st);
  const count = (st: string) => {
    const r = find(st);
    return r ? num(r, "c") : 0;
  };
  const total = (st: string) => {
    const r = find(st);
    return r ? num(r, "t") : 0;
  };

  return {
    draftCount: count("borrador"),
    sentCount: count("enviado"),
    expiredCount: count("caducado"),
    acceptedCount: count("aceptado"),
    rejectedCount: count("rechazado"),
    openTotalCents: total("enviado"),
    acceptedYearTotalCents: num(accepted.rows[0], "t"),
    recent,
  };
}
