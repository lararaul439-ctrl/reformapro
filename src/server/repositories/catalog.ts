import type { Row } from "@libsql/client";
import type { CatalogItem } from "@/lib/types";
import type { CatalogItemInput } from "@/lib/schemas";
import { priceFromCostAndMarkup } from "@/lib/calc";
import { matchesQuery } from "@/lib/search";
import type { ItemType } from "@/lib/units";
import type { Db } from "../db/client";
import { bool, inTransaction, newId, nowISO, num, str } from "../db/helpers";
import { DomainError } from "../errors";

function mapItem(r: Row): CatalogItem {
  return {
    id: str(r, "id"),
    code: str(r, "code"),
    name: str(r, "name"),
    description: str(r, "description"),
    itemType: str(r, "item_type") as ItemType,
    category: str(r, "category"),
    unit: str(r, "unit"),
    unitCostCents: num(r, "unit_cost_cents"),
    unitPriceCents: num(r, "unit_price_cents"),
    vatRateBp: num(r, "vat_rate_bp"),
    isActive: bool(r, "is_active"),
    createdAt: str(r, "created_at"),
    updatedAt: str(r, "updated_at"),
  };
}

export interface CatalogFilters {
  q?: string;
  type?: ItemType;
  category?: string;
  includeInactive?: boolean;
}

export async function listCatalogItems(
  db: Db,
  filters: CatalogFilters = {},
): Promise<CatalogItem[]> {
  const where: string[] = [];
  const args: (string | number)[] = [];
  if (!filters.includeInactive) where.push("is_active = 1");
  if (filters.type) {
    where.push("item_type = ?");
    args.push(filters.type);
  }
  if (filters.category) {
    where.push("category = ?");
    args.push(filters.category);
  }
  const res = await db.execute({
    sql: `SELECT * FROM catalog_items ${where.length ? "WHERE " + where.join(" AND ") : ""}
          ORDER BY category COLLATE NOCASE, name COLLATE NOCASE`,
    args,
  });
  const items = res.rows.map(mapItem);
  const q = filters.q?.trim();
  return q
    ? items.filter((i) => matchesQuery(q, i.code, i.name, i.description, i.category))
    : items;
}

export async function listCatalogCategories(db: Db): Promise<string[]> {
  const res = await db.execute(
    "SELECT DISTINCT category FROM catalog_items WHERE category <> '' ORDER BY category COLLATE NOCASE",
  );
  return res.rows.map((r) => str(r, "category"));
}

export async function getCatalogItem(db: Db, id: string): Promise<CatalogItem | null> {
  const res = await db.execute({ sql: "SELECT * FROM catalog_items WHERE id = ?", args: [id] });
  return res.rows[0] ? mapItem(res.rows[0]) : null;
}

export async function createCatalogItem(db: Db, input: CatalogItemInput): Promise<string> {
  const id = newId();
  const now = nowISO();
  await db.execute({
    sql: `INSERT INTO catalog_items
      (id, code, name, description, item_type, category, unit, unit_cost_cents, unit_price_cents,
       vat_rate_bp, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id, input.code, input.name, input.description, input.itemType, input.category, input.unit,
      input.unitCostCents, input.unitPriceCents, input.vatRateBp, input.isActive ? 1 : 0, now, now,
    ],
  });
  return id;
}

export async function updateCatalogItem(
  db: Db,
  id: string,
  input: CatalogItemInput,
): Promise<void> {
  const res = await db.execute({
    sql: `UPDATE catalog_items SET code = ?, name = ?, description = ?, item_type = ?, category = ?,
          unit = ?, unit_cost_cents = ?, unit_price_cents = ?, vat_rate_bp = ?, is_active = ?,
          updated_at = ? WHERE id = ?`,
    args: [
      input.code, input.name, input.description, input.itemType, input.category, input.unit,
      input.unitCostCents, input.unitPriceCents, input.vatRateBp, input.isActive ? 1 : 0,
      nowISO(), id,
    ],
  });
  if (res.rowsAffected === 0) throw new DomainError("El artículo no existe.");
}

/** Los presupuestos guardan una copia de los datos de cada partida: borrar es seguro. */
export async function deleteCatalogItem(db: Db, id: string): Promise<void> {
  await db.execute({ sql: "DELETE FROM catalog_items WHERE id = ?", args: [id] });
}

// ---------------------------------------------------------------------------
// Biblioteca de ejemplo (opcional). Costes ORIENTATIVOS: la persona usuaria
// debe ajustarlos a sus propios costes y proveedores.
// ---------------------------------------------------------------------------

interface StarterItem {
  code: string;
  name: string;
  itemType: ItemType;
  category: string;
  unit: string;
  costCents: number;
}

const STARTER_ITEMS: StarterItem[] = [
  { code: "DEM-01", name: "Demolición de tabique de ladrillo hueco", itemType: "servicio", category: "Demoliciones", unit: "m²", costCents: 950 },
  { code: "DEM-02", name: "Retirada de escombros a vertedero autorizado", itemType: "servicio", category: "Demoliciones", unit: "m³", costCents: 3800 },
  { code: "ALB-01", name: "Tabique de ladrillo hueco doble, recibido con mortero", itemType: "servicio", category: "Albañilería", unit: "m²", costCents: 2100 },
  { code: "ALB-02", name: "Enfoscado maestreado de paramentos", itemType: "servicio", category: "Albañilería", unit: "m²", costCents: 1150 },
  { code: "ALB-03", name: "Recrecido de suelo con mortero autonivelante", itemType: "servicio", category: "Albañilería", unit: "m²", costCents: 1400 },
  { code: "REV-01", name: "Alicatado de paramentos con azulejo (colocación)", itemType: "servicio", category: "Revestimientos", unit: "m²", costCents: 2200 },
  { code: "REV-02", name: "Solado con gres porcelánico (colocación)", itemType: "servicio", category: "Revestimientos", unit: "m²", costCents: 2400 },
  { code: "REV-03", name: "Gres porcelánico 60×60 cm (suministro)", itemType: "material", category: "Revestimientos", unit: "m²", costCents: 1800 },
  { code: "PIN-01", name: "Pintura plástica lisa en paredes y techos", itemType: "servicio", category: "Pintura", unit: "m²", costCents: 480 },
  { code: "PIN-02", name: "Plastecido y lijado de paramentos", itemType: "servicio", category: "Pintura", unit: "m²", costCents: 320 },
  { code: "ELE-01", name: "Punto de luz o enchufe, instalación completa", itemType: "servicio", category: "Electricidad", unit: "ud", costCents: 3600 },
  { code: "ELE-02", name: "Cuadro eléctrico de vivienda con protecciones", itemType: "servicio", category: "Electricidad", unit: "ud", costCents: 28000 },
  { code: "FON-01", name: "Punto de agua fría/caliente en multicapa", itemType: "servicio", category: "Fontanería", unit: "ud", costCents: 5800 },
  { code: "FON-02", name: "Instalación de plato de ducha y desagüe", itemType: "servicio", category: "Fontanería", unit: "ud", costCents: 12000 },
  { code: "CAR-01", name: "Puerta interior lisa lacada con herrajes (suministro y colocación)", itemType: "servicio", category: "Carpintería", unit: "ud", costCents: 23500 },
  { code: "MO-01", name: "Oficial de 1ª", itemType: "mano_obra", category: "Mano de obra", unit: "h", costCents: 2400 },
  { code: "MO-02", name: "Peón ordinario", itemType: "mano_obra", category: "Mano de obra", unit: "h", costCents: 1800 },
];

/**
 * Inserta la biblioteca de ejemplo. Omite los códigos que ya existan.
 * El IVA de cada artículo es el tipo predeterminado actual: no se asume ningún
 * tipo concreto para cada trabajo; la persona usuaria debe revisarlo.
 */
export async function importStarterCatalog(
  db: Db,
  opts: { markupBp: number; vatRateBp: number },
): Promise<{ added: number; skipped: number }> {
  return inTransaction(db, async (tx) => {
    const existing = new Set(
      (await tx.execute("SELECT code FROM catalog_items WHERE code <> ''")).rows.map((r) =>
        str(r, "code"),
      ),
    );
    let added = 0;
    let skipped = 0;
    const now = nowISO();
    for (const it of STARTER_ITEMS) {
      if (existing.has(it.code)) {
        skipped++;
        continue;
      }
      await tx.execute({
        sql: `INSERT INTO catalog_items
          (id, code, name, description, item_type, category, unit, unit_cost_cents,
           unit_price_cents, vat_rate_bp, is_active, created_at, updated_at)
          VALUES (?, ?, ?, '', ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
        args: [
          newId(), it.code, it.name, it.itemType, it.category, it.unit, it.costCents,
          priceFromCostAndMarkup(it.costCents, opts.markupBp), opts.vatRateBp, now, now,
        ],
      });
      added++;
    }
    return { added, skipped };
  });
}
