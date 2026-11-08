/** Resultado estándar de las acciones de servidor (serializable). */
export type ActionResult<T extends object = object> =
  | ({ ok: true } & T)
  | { ok: false; message: string; errors?: Record<string, string> };
