import { isValidISODate } from "./dates";

export const QUOTE_STATUSES = ["borrador", "enviado", "aceptado", "rechazado"] as const;
export type QuoteStatus = (typeof QUOTE_STATUSES)[number];

/** Estado mostrado: un presupuesto "enviado" cuya validez venció se muestra "caducado". */
export type DisplayStatus = QuoteStatus | "caducado";

export const STATUS_LABELS: Record<DisplayStatus, string> = {
  borrador: "Borrador",
  enviado: "Enviado",
  aceptado: "Aceptado",
  rechazado: "Rechazado",
  caducado: "Caducado",
};

export function isQuoteStatus(value: string): value is QuoteStatus {
  return (QUOTE_STATUSES as readonly string[]).includes(value);
}

export function displayStatus(
  status: QuoteStatus,
  validUntil: string | null,
  todayISO: string,
): DisplayStatus {
  if (
    status === "enviado" &&
    validUntil &&
    isValidISODate(validUntil) &&
    validUntil < todayISO
  ) {
    return "caducado";
  }
  return status;
}
