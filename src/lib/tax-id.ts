/**
 * Validación de identificadores fiscales españoles: DNI/NIF, NIE y CIF.
 * Se usa como AVISO en formularios (puede haber clientes extranjeros), no como bloqueo.
 */

const DNI_LETTERS = "TRWAGMYFPDXBNJZSQVHLCKE";
const CIF_CONTROL_LETTERS = "JABCDEFGHI";

export type TaxIdType = "DNI" | "NIE" | "CIF";

export interface TaxIdCheck {
  valid: boolean;
  type: TaxIdType | null;
  /** Mayúsculas y sin espacios/guiones. */
  normalized: string;
}

export function normalizeTaxId(input: string): string {
  return input.toUpperCase().replace(/[\s.\-_/]/g, "");
}

function checkDni(id: string): boolean {
  const m = /^(\d{8})([A-Z])$/.exec(id);
  if (!m) return false;
  return DNI_LETTERS[Number(m[1]) % 23] === m[2];
}

function checkNie(id: string): boolean {
  const m = /^([XYZ])(\d{7})([A-Z])$/.exec(id);
  if (!m) return false;
  const prefix = { X: "0", Y: "1", Z: "2" }[m[1] as "X" | "Y" | "Z"];
  return DNI_LETTERS[Number(prefix + m[2]) % 23] === m[3];
}

function checkCif(id: string): boolean {
  const m = /^([ABCDEFGHJNPQRSUVW])(\d{7})([0-9A-J])$/.exec(id);
  if (!m) return false;
  const [, entity, digits, control] = m;

  let sum = 0;
  for (let i = 0; i < 7; i++) {
    const d = Number(digits[i]);
    if (i % 2 === 0) {
      const doubled = d * 2;
      sum += Math.floor(doubled / 10) + (doubled % 10);
    } else {
      sum += d;
    }
  }
  const controlDigit = (10 - (sum % 10)) % 10;
  const controlLetter = CIF_CONTROL_LETTERS[controlDigit];

  if ("PQRSNW".includes(entity)) return control === controlLetter; // siempre letra
  if ("ABEH".includes(entity)) return control === String(controlDigit); // siempre número
  return control === String(controlDigit) || control === controlLetter;
}

export function validateSpanishTaxId(input: string): TaxIdCheck {
  const normalized = normalizeTaxId(input);
  if (checkDni(normalized)) return { valid: true, type: "DNI", normalized };
  if (checkNie(normalized)) return { valid: true, type: "NIE", normalized };
  if (checkCif(normalized)) return { valid: true, type: "CIF", normalized };
  return { valid: false, type: null, normalized };
}
