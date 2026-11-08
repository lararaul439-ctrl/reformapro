"use server";

import type { ActionResult } from "@/lib/action-result";
import { todayISO } from "@/lib/dates";
import { isQuoteStatus } from "@/lib/quote-status";
import { quoteInputSchema } from "@/lib/schemas";
import { parseInput, runAction } from "@/server/action-helpers";
import { getContext } from "@/server/context";
import { getDb } from "@/server/db/client";
import { DomainError } from "@/server/errors";
import { getCompany } from "@/server/repositories/company";
import {
  createQuote,
  deleteQuote,
  duplicateQuote,
  setQuoteStatus,
  updateQuote,
} from "@/server/repositories/quotes";

export async function saveQuoteAction(
  id: string | null,
  payload: unknown,
): Promise<ActionResult<{ id: string; number: string }>> {
  const parsed = parseInput(quoteInputSchema, payload);
  if (!parsed.ok) return parsed.result;
  return runAction(async () => {
    const db = await getDb();
    if (id) {
      const { number } = await updateQuote(db, id, parsed.data);
      return { id, number };
    }
    return createQuote(db, parsed.data, getContext());
  });
}

export async function setQuoteStatusAction(id: string, status: string): Promise<ActionResult> {
  return runAction(async () => {
    if (!isQuoteStatus(status)) throw new DomainError("Estado no válido.");
    await setQuoteStatus(await getDb(), id, status);
    return {};
  });
}

export async function duplicateQuoteAction(
  id: string,
): Promise<ActionResult<{ id: string; number: string }>> {
  return runAction(async () => {
    const db = await getDb();
    const company = await getCompany(db);
    return duplicateQuote(
      db,
      id,
      { today: todayISO(), validityDays: company.defaultValidityDays },
      getContext(),
    );
  });
}

export async function deleteQuoteAction(id: string): Promise<ActionResult> {
  return runAction(async () => {
    await deleteQuote(await getDb(), id);
    return {};
  });
}
