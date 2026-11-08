import { revalidatePath } from "next/cache";
import type { z } from "zod";
import type { ActionResult } from "@/lib/action-result";
import { flattenZodErrors } from "@/lib/schemas";
import { DomainError } from "./errors";

type Parsed<S extends z.ZodType> =
  | { ok: true; data: z.output<S> }
  | { ok: false; result: Extract<ActionResult, { ok: false }> };

/** Valida datos NO confiables (vienen del navegador) con un esquema zod. */
export function parseInput<S extends z.ZodType>(schema: S, data: unknown): Parsed<S> {
  const parsed = schema.safeParse(data);
  if (parsed.success) return { ok: true, data: parsed.data };
  return {
    ok: false,
    result: {
      ok: false,
      message: "Revisa los campos marcados en rojo.",
      errors: flattenZodErrors(parsed.error),
    },
  };
}

/** Ejecuta una acción convirtiendo los errores en un resultado apto para la interfaz. */
export async function runAction<T extends object = object>(
  fn: () => Promise<T>,
): Promise<ActionResult<T>> {
  try {
    const value = await fn();
    revalidatePath("/", "layout");
    return { ok: true, ...value };
  } catch (err) {
    if (err instanceof DomainError) return { ok: false, message: err.message };
    console.error("[ReformaPro] Error inesperado en acción de servidor:", err);
    return { ok: false, message: "No se pudo completar la operación. Inténtalo de nuevo." };
  }
}
