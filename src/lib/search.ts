/** Normaliza texto para búsquedas sin distinguir mayúsculas ni acentos ("García" ~ "garcia"). */
export function normalizeForSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

/** Todas las palabras de la consulta deben aparecer en alguno de los campos. */
export function matchesQuery(query: string, ...fields: string[]): boolean {
  const words = normalizeForSearch(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const haystack = normalizeForSearch(fields.join(" "));
  return words.every((w) => haystack.includes(w));
}
