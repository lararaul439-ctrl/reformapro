import type { Row, Transaction } from "@libsql/client";
import type { Db } from "./client";

export type Executor = Pick<Db, "execute">;

export const str = (r: Row, k: string): string => String(r[k] ?? "");
export const num = (r: Row, k: string): number => Number(r[k] ?? 0);
export const bool = (r: Row, k: string): boolean => Number(r[k]) === 1;
export const strOrNull = (r: Row, k: string): string | null =>
  r[k] === null || r[k] === undefined ? null : String(r[k]);

export const nowISO = (): string => new Date().toISOString();
export const newId = (): string => crypto.randomUUID();

/** Ejecuta `fn` en una transacción de escritura: confirma si termina, deshace si falla. */
export async function inTransaction<T>(
  db: Db,
  fn: (tx: Transaction) => Promise<T>,
): Promise<T> {
  const tx = await db.transaction("write");
  try {
    const result = await fn(tx);
    await tx.commit();
    return result;
  } catch (err) {
    try {
      await tx.rollback();
    } catch {
      /* ya revertida */
    }
    throw err;
  } finally {
    tx.close();
  }
}
