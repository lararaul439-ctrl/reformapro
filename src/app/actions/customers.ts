"use server";

import type { ActionResult } from "@/lib/action-result";
import { customerSchema } from "@/lib/schemas";
import { parseInput, runAction } from "@/server/action-helpers";
import { getDb } from "@/server/db/client";
import { createCustomer, deleteCustomer, updateCustomer } from "@/server/repositories/customers";

export async function saveCustomerAction(
  id: string | null,
  payload: unknown,
): Promise<ActionResult<{ id: string }>> {
  const parsed = parseInput(customerSchema, payload);
  if (!parsed.ok) return parsed.result;
  return runAction(async () => {
    const db = await getDb();
    if (id) {
      await updateCustomer(db, id, parsed.data);
      return { id };
    }
    return { id: await createCustomer(db, parsed.data) };
  });
}

export async function deleteCustomerAction(id: string): Promise<ActionResult> {
  return runAction(async () => {
    await deleteCustomer(await getDb(), id);
    return {};
  });
}
