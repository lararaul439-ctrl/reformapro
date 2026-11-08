/**
 * Fechas en formato español (DD/MM/AAAA).
 *
 * Internamente las fechas "de calendario" (emisión, validez) se guardan como
 * texto ISO "AAAA-MM-DD". Las marcas de tiempo (creación, cambios) como ISO UTC.
 */

export const APP_TIME_ZONE = "Europe/Madrid";

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

function isRealDate(y: number, m: number, d: number): boolean {
  if (m < 1 || m > 12 || d < 1) return false;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

export function isValidISODate(value: string): boolean {
  const m = ISO_DATE.exec(value);
  return !!m && isRealDate(Number(m[1]), Number(m[2]), Number(m[3]));
}

/** Fecha de hoy ("AAAA-MM-DD") en la zona horaria de la aplicación. */
export function todayISO(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)!.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** Suma días a una fecha ISO "AAAA-MM-DD". */
export function addDaysISO(iso: string, days: number): string {
  const m = ISO_DATE.exec(iso);
  if (!m) throw new Error(`Fecha ISO no válida: ${iso}`);
  const dt = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]) + days));
  return dt.toISOString().slice(0, 10);
}

/** "2026-11-08" -> "08/11/2026". Acepta también marcas de tiempo ISO completas. */
export function formatDateEs(value: string | null | undefined): string {
  if (!value) return "";
  if (ISO_DATE.test(value)) {
    const [y, m, d] = value.split("-");
    return `${d}/${m}/${y}`;
  }
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return "";
  return formatDateEs(todayISO(dt));
}

/** Marca de tiempo ISO -> "08/11/2026 23:26" (hora de España). */
export function formatDateTimeEs(value: string | null | undefined): string {
  if (!value) return "";
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return "";
  const time = new Intl.DateTimeFormat("es-ES", {
    timeZone: APP_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(dt);
  return `${formatDateEs(todayISO(dt))} ${time}`;
}

/**
 * Interpreta una fecha escrita por una persona: "8/11/2026", "08-11-2026",
 * "08.11.26"... Devuelve "AAAA-MM-DD" o null si no es una fecha real.
 */
export function parseDateEs(input: string): string | null {
  const s = input.trim();
  if (!s) return null;
  const m = /^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2}|\d{4})$/.exec(s);
  if (!m) return null;
  const d = Number(m[1]);
  const mo = Number(m[2]);
  let y = Number(m[3]);
  if (m[3].length === 2) y += 2000;
  if (!isRealDate(y, mo, d)) return null;
  return `${String(y).padStart(4, "0")}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}
