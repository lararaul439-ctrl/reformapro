"use server";

import type { ActionResult } from "@/lib/action-result";
import { catalogItemSchema } from "@/lib/schemas";
import { parseInput, runAction } from "@/server/action-helpers";
import { getDb } from "@/server/db/client";
import {
  createCatalogItem,
  deleteCatalogItem,
  importStarterCatalog,
  updateCatalogItem,
} from "@/server/repositories/catalog";
import { getCompany } from "@/server/repositories/company";
import { getDefaultTaxRate } from "@/server/repositories/tax-rates";

export async function saveCatalogItemAction(
  id: string | null,
  payload: unknown,
): Promise<ActionResult<{ id: string }>> {
  const parsed = parseInput(catalogItemSchema, payload);
  if (!parsed.ok) return parsed.result;
  return runAction(async () => {
    const db = await getDb();
    if (id) {
      await updateCatalogItem(db, id, parsed.data);
      return { id };
    }
    return { id: await createCatalogItem(db, parsed.data) };
  });
}

export async function deleteCatalogItemAction(id: string): Promise<ActionResult> {
  return runAction(async () => {
    await deleteCatalogItem(await getDb(), id);
    return {};
  });
}

export async function importStarterCatalogAction(): Promise<
  ActionResult<{ added: number; skipped: number }>
> {
  return runAction(async () => {
    const db = await getDb();
    const [company, rate] = await Promise.all([getCompany(db), getDefaultTaxRate(db)]);
    return importStarterCatalog(db, {
      markupBp: company.defaultMarkupBp,
      vatRateBp: rate?.rateBp ?? 2100,
    });
  });
}
