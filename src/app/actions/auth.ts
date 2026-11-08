"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  accessPassword,
  createSessionToken,
  safeEqual,
  safeNextPath,
} from "@/server/auth/session";

export interface LoginState {
  error?: string;
}

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const password = accessPassword();
  const next = safeNextPath(formData.get("next"));
  if (!password) redirect(next); // sin contraseña configurada no hay nada que comprobar

  const given = String(formData.get("password") ?? "");
  if (!safeEqual(given, password)) {
    await new Promise((r) => setTimeout(r, 800)); // frena los intentos por fuerza bruta
    return { error: "Contraseña incorrecta." };
  }

  const jar = await cookies();
  jar.set(SESSION_COOKIE, await createSessionToken(password), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production" && process.env.INSECURE_COOKIES !== "1",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  redirect(next);
}

export async function logoutAction(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  redirect("/acceso");
}
