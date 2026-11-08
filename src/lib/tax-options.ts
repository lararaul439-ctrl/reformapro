import { formatPercentBp } from "./money";
import type { TaxRate } from "./types";

/** Opciones de IVA para un desplegable: tipos activos + el valor actual si ya no está en la lista. */
export function vatOptions(rates: TaxRate[], currentBp: number): { bp: number; label: string }[] {
  const options = rates.filter((r) => r.isActive).map((r) => ({ bp: r.rateBp, label: r.name }));
  if (!options.some((o) => o.bp === currentBp)) {
    options.push({ bp: currentBp, label: `IVA ${formatPercentBp(currentBp)} (personalizado)` });
  }
  return options;
}
