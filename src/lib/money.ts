/**
 * Utilidades de dinero y números en formato español.
 *
 * Reglas del proyecto:
 *  - Todos los importes se guardan y calculan en CÉNTIMOS ENTEROS (nunca floats).
 *  - Los porcentajes se guardan en PUNTOS BÁSICOS enteros (21 % = 2100).
 *  - Formato de salida: 1.250,50 € (punto de millar, coma decimal, símbolo detrás).
 */

export const NBSP = " ";

/** División entera con redondeo "half away from zero" (simétrico para negativos). */
export function divRound(numerator: number, denominator: number): number {
  if (denominator === 0) throw new Error("División por cero");
  const sign = Math.sign(numerator) * Math.sign(denominator);
  const n = Math.abs(numerator);
  const d = Math.abs(denominator);
  const q = Math.floor(n / d);
  const r = n - q * d;
  const rounded = r * 2 >= d ? q + 1 : q;
  return sign < 0 ? -rounded : rounded;
}

/**
 * (a × b) / d redondeado half away from zero. Si el producto excede el rango de
 * enteros seguros de JS, calcula con BigInt para no perder precisión.
 */
export function mulDivRound(a: number, b: number, d: number): number {
  const product = a * b;
  if (Number.isSafeInteger(product)) return divRound(product, d);
  if (d === 0) throw new Error("División por cero");
  const negative = a < 0 !== b < 0 !== d < 0;
  const p = BigInt(Math.abs(a)) * BigInt(Math.abs(b));
  const den = BigInt(Math.abs(d));
  let q = p / den;
  if ((p % den) * 2n >= den) q += 1n;
  const result = Number(q);
  return negative && result !== 0 ? -result : result;
}

/** Redondea un número al entero más cercano (half away from zero). Evita -0. */
export function roundInt(n: number): number {
  const r = Math.sign(n) * Math.round(Math.abs(n));
  return r === 0 ? 0 : r;
}

/** Euros (decimal) -> céntimos enteros. */
export function eurosToCents(euros: number): number {
  // toFixed corrige errores binarios típicos (p. ej. 1.005)
  return roundInt(Number((euros * 100).toPrecision(15)));
}

export function centsToEuros(cents: number): number {
  return cents / 100;
}

/** Porcentaje (21,5) -> puntos básicos (2150). */
export function percentToBp(percent: number): number {
  return roundInt(Number((percent * 100).toPrecision(15)));
}

export function bpToPercent(bp: number): number {
  return bp / 100;
}

function groupThousands(intPart: string): string {
  return intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/**
 * Formatea un número con separadores españoles.
 * @param minDecimals mínimo de decimales a mostrar
 * @param maxDecimals máximo de decimales (se redondea)
 */
export function formatNumberEs(
  value: number,
  minDecimals = 0,
  maxDecimals = minDecimals,
): string {
  if (!Number.isFinite(value)) return "";
  const negative = value < 0;
  let fixed = Math.abs(value).toFixed(maxDecimals);
  // Recorta ceros sobrantes hasta minDecimals
  if (maxDecimals > minDecimals && fixed.includes(".")) {
    const [i, rawDecimals] = fixed.split(".");
    let d = rawDecimals;
    while (d.length > minDecimals && d.endsWith("0")) d = d.slice(0, -1);
    fixed = d.length ? `${i}.${d}` : i;
  }
  const [intPart, decPart] = fixed.split(".");
  const body = groupThousands(intPart) + (decPart ? `,${decPart}` : "");
  // Un -0,00 no debe mostrarse con signo
  const isZero = Number(fixed) === 0;
  return negative && !isZero ? `-${body}` : body;
}

/** 125050 -> "1.250,50 €" (con espacio duro antes de €). */
export function formatEUR(cents: number, opts: { symbol?: boolean } = {}): string {
  const { symbol = true } = opts;
  const n = formatNumberEs(cents / 100, 2, 2);
  return symbol ? `${n}${NBSP}€` : n;
}

/** 2100 -> "21 %"; 1050 -> "10,5 %". */
export function formatPercentBp(bp: number): string {
  return `${formatNumberEs(bp / 100, 0, 2)}${NBSP}%`;
}

/** Cantidad con hasta 3 decimales: 12.5 -> "12,5"; 1250 -> "1.250". */
export function formatQuantity(q: number): string {
  return formatNumberEs(q, 0, 3);
}

/**
 * Interpreta texto numérico escrito por una persona en España.
 *  - "1.250,50" -> 1250.5     "1250,5" -> 1250.5     "1250.5" -> 1250.5
 *  - "1.250"    -> 1250       (punto seguido de exactamente 3 dígitos = millar)
 *  - Ignora espacios, "€" y "%".
 * Devuelve null si no es un número válido.
 */
export function parseDecimalEs(input: string): number | null {
  if (typeof input !== "string") return null;
  let s = input.replace(/[\s €%]/g, "");
  if (s === "") return null;

  let sign = 1;
  if (s.startsWith("-")) {
    sign = -1;
    s = s.slice(1);
  } else if (s.startsWith("+")) {
    s = s.slice(1);
  }
  if (!/^[\d.,]+$/.test(s) || !/\d/.test(s)) return null;

  const lastComma = s.lastIndexOf(",");
  const dotCount = (s.match(/\./g) ?? []).length;
  let normalized: string;

  if (lastComma !== -1) {
    // La coma es el separador decimal; los puntos son de millar.
    if ((s.match(/,/g) ?? []).length > 1) return null;
    const intPart = s.slice(0, lastComma);
    const decPart = s.slice(lastComma + 1);
    if (!/^(\d{1,3}(\.\d{3})*|\d*)$/.test(intPart)) return null;
    if (!/^\d*$/.test(decPart)) return null;
    normalized = `${intPart.replace(/\./g, "")}.${decPart || "0"}`;
  } else if (dotCount === 0) {
    normalized = s;
  } else if (/^\d{1,3}(\.\d{3})+$/.test(s)) {
    // Solo grupos de 3 dígitos tras el punto: millares ("1.250", "1.250.000")
    normalized = s.replace(/\./g, "");
  } else if (dotCount === 1 && /^\d*\.\d+$/.test(s)) {
    // Un solo punto decimal ("12.5")
    normalized = s;
  } else {
    return null;
  }

  const n = Number(normalized);
  if (!Number.isFinite(n)) return null;
  const result = sign * n;
  return result === 0 ? 0 : result;
}

/** Texto de un número para rellenar un input editable (sin millares): 1250.5 -> "1250,5". */
export function toInputString(value: number | null | undefined, maxDecimals = 2): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "";
  let s = value.toFixed(maxDecimals);
  if (s.includes(".")) s = s.replace(/0+$/, "").replace(/\.$/, "");
  return s.replace(".", ",");
}
