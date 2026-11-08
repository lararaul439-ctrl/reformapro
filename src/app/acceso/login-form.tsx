"use client";

import { useActionState } from "react";
import { loginAction, type LoginState } from "@/app/actions/auth";
import { Banner } from "@/components/ui/card";
import { Field, TextInput } from "@/components/ui/fields";
import { Button } from "@/components/ui/button";

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(loginAction, {});
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      {state.error && <Banner tone="error">{state.error}</Banner>}
      <Field label="Contraseña" htmlFor="password">
        <TextInput id="password" name="password" type="password" autoComplete="current-password" autoFocus required />
      </Field>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Comprobando…" : "Entrar"}
      </Button>
    </form>
  );
}
