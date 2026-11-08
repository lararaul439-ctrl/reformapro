"use server";

import type { ActionResult } from "@/lib/action-result";
import { companySchema } from "@/lib/schemas";
import { parseInput, runAction } from "@/server/action-helpers";
import { getDb } from "@/server/db/client";
import { saveCompany } from "@/server/repositories/company";

export async function saveCompanyAction(payload: unknown): Promise<ActionResult> {
  const parsed = parseInput(companySchema, payload);
  if (!parsed.ok) return parsed.result;
  return runAction(async () => {
    await saveCompany(await getDb(), parsed.data);
    return {};
  });
}
