/**
 * Contexto de la petición.
 *
 * HOY la aplicación tiene un único trabajador, así que el contexto es fijo.
 * Es el punto de extensión previsto para varios trabajadores: cuando exista
 * autenticación por usuario, `getContext()` devolverá la persona autenticada
 * y los repositorios (que ya reciben el contexto) podrán filtrar o registrar
 * autoría sin tocar el resto del código.
 */
export interface RequestContext {
  userId: string;
}

export const DEFAULT_CONTEXT: RequestContext = { userId: "default" };

export function getContext(): RequestContext {
  return DEFAULT_CONTEXT;
}
