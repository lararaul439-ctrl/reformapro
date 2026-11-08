/** Unidades de medida habituales en presupuestos de reformas (se pueden escribir otras). */
export const COMMON_UNITS = [
  "ud",
  "m²",
  "m³",
  "m",
  "ml",
  "h",
  "día",
  "kg",
  "l",
  "saco",
  "pa", // partida alzada
] as const;

export const ITEM_TYPES = ["material", "servicio", "mano_obra"] as const;
export type ItemType = (typeof ITEM_TYPES)[number];

export const ITEM_TYPE_LABELS: Record<ItemType, string> = {
  material: "Material",
  servicio: "Servicio",
  mano_obra: "Mano de obra",
};

export const PROVINCES = [
  "Álava", "Albacete", "Alicante", "Almería", "Asturias", "Ávila", "Badajoz", "Barcelona",
  "Burgos", "Cáceres", "Cádiz", "Cantabria", "Castellón", "Ciudad Real", "Córdoba",
  "A Coruña", "Cuenca", "Girona", "Granada", "Guadalajara", "Gipuzkoa", "Huelva", "Huesca",
  "Illes Balears", "Jaén", "León", "Lleida", "Lugo", "Madrid", "Málaga", "Murcia", "Navarra",
  "Ourense", "Palencia", "Las Palmas", "Pontevedra", "La Rioja", "Salamanca",
  "Santa Cruz de Tenerife", "Segovia", "Sevilla", "Soria", "Tarragona", "Teruel", "Toledo",
  "Valencia", "Valladolid", "Bizkaia", "Zamora", "Zaragoza", "Ceuta", "Melilla",
] as const;
