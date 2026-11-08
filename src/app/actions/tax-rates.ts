"use server";

import type { ActionResult } from "@/lib/action-result";
import { taxRateSchema } from "@/lib/schemas";
import { parseInput, runAction } from "@/server/action-helpers";
import { getDb } from "@/server/db/client";
import {
  createTaxRate,
  deleteTaxRate,
  setDefaultTaxRate,
  setTaxRateActive,
  updateTaxRate,
} from "@/server/repositories/tax-rates";

export async function createTaxRateAction(payload: unknown): Promise<ActionResult> {
  const parsed = parseInput(taxRateSchema, payload);
  if (!parsed.ok) return parsed.result;
  return runAction(async () => {
    await createTaxRate(await getDb(), parsed.data);
    return {};
  });
}

export async function updateTaxRateAction(id: string, payload: unknown): Promise<ActionResult> {
  const parsed = parseInput(taxRateSchema, payload);
  if (!parsed.ok) return parsed.result;
  return runAction(async () => {
    await updateTaxRate(await getDb(), id, parsed.data);
    return {};
  });
}

export async function setTaxRateActiveAction(id: string, active: boolean): Promise<ActionResult> {
  return runAction(async () => {
    await setTaxRateActive(await getDb(), id, active);
    return {};
  });
}

export async function setDefaultTaxRateAction(id: string): Promise<ActionResult> {
  return runAction(async () => {
    await setDefaultTaxRate(await getDb(), id);
    return {};
  });
}

export async function deleteTaxRateAction(id: string): Promise<ActionResult> {
  return runAction(async () => {
    await deleteTaxRate(await getDb(), id);
    return {};
  });
}
