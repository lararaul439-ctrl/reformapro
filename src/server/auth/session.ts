/**
 * Acceso opcional con una contraseña única.
 *
 * - Sin `ACCESS_PASSWORD` no hay protección (uso local).
 * - Con `ACCESS_PASSWORD` definida, hay que iniciar sesión en /acceso.
 *
 * La cookie guarda "caducidad.firma", donde la firma es HMAC-SHA256 de la caducidad con la
 * propia contraseña como clave. Cambiar la contraseña invalida todas las sesiones.
 * Usa Web Crypto para funcionar tanto en el proxy como en las acciones del servidor.
 */

export const SESSION_COOKIE = "reformapro_sesion";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 días

const encoder = new TextEncoder();

export function accessPassword(): string {
  return process.env.ACCESS_PASSWORD?.trim() ?? "";
}

export function isAccessGateEnabled(): boolean {
  return accessPassword() !== "";
}

async function sign(password: string, expiresAt: number): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, encoder.encode(`reformapro-sesion:${expiresAt}`));
  return Array.from(new Uint8Array(mac), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Comparación en tiempo constante (para no filtrar información por tiempos de respuesta). */
export function safeEqual(a: string, b: string): boolean {
  const ab = encoder.encode(a);
  const bb = encoder.encode(b);
  let diff = ab.length ^ bb.length;
  const len = Math.max(ab.length, bb.length);
  for (let i = 0; i < len; i++) diff |= (ab[i] ?? 0) ^ (bb[i] ?? 0);
  return diff === 0;
}

export async function createSessionToken(password: string, nowMs = Date.now()): Promise<string> {
  const expiresAt = Math.floor(nowMs / 1000) + SESSION_MAX_AGE_SECONDS;
  return `${expiresAt}.${await sign(password, expiresAt)}`;
}

export async function verifySessionToken(
  token: string | undefined,
  password: string,
  nowMs = Date.now(),
): Promise<boolean> {
  if (!token || !password) return false;
  const dot = token.indexOf(".");
  if (dot < 1) return false;
  const expiresAt = Number(token.slice(0, dot));
  if (!Number.isSafeInteger(expiresAt) || expiresAt * 1000 < nowMs) return false;
  return safeEqual(token.slice(dot + 1), await sign(password, expiresAt));
}

/** Solo rutas internas ("/algo"); evita redirecciones a otros sitios. */
export function safeNextPath(next: unknown): string {
  if (typeof next !== "string") return "/";
  if (!next.startsWith("/") || next.startsWith("//") || next.includes("\\") || /[\r\n]/.test(next)) return "/";
  if (next.startsWith("/acceso")) return "/";
  return next;
}
