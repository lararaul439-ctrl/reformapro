"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { saveCustomerAction, deleteCustomerAction } from "@/app/actions/customers";
import { useForm } from "@/components/forms/use-form";
import { Banner, Card, CardHeader } from "@/components/ui/card";
import { Button, ButtonLink } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { Field, Select, TextArea, TextInput } from "@/components/ui/fields";
import { validateSpanishTaxId } from "@/lib/tax-id";
import type { Customer } from "@/lib/types";
import { PROVINCES } from "@/lib/units";

const EMPTY = {
  kind: "particular" as "particular" | "empresa",
  name: "",
  taxId: "",
  email: "",
  phone: "",
  address: "",
  postalCode: "",
  city: "",
  province: "",
  notes: "",
};

export function CustomerForm({
  customer,
  nextUrl,
  canDelete = true,
}: {
  customer?: Customer;
  /** Si se indica, tras crear el cliente se vuelve a esa ruta con ?cliente=ID. */
  nextUrl?: string;
  canDelete?: boolean;
}) {
  const router = useRouter();
  const form = useForm(customer ? { ...EMPTY, ...customer } : EMPTY);
  const { values: v, set, errors } = form;
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const taxCheck = v.taxId.trim() ? validateSpanishTaxId(v.taxId) : null;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    startTransition(async () => {
      const res = await saveCustomerAction(customer?.id ?? null, v);
      if (!res.ok) {
        form.setErrors(res.errors ?? {});
        setMessage({ tone: "error", text: res.message });
        return;
      }
      form.setDirty(false);
      if (!customer) {
        router.push(nextUrl ? `${nextUrl}?cliente=${res.id}` : `/clientes/${res.id}`);
      } else {
        setMessage({ tone: "success", text: "Cambios guardados." });
        router.refresh();
      }
    });
  }

  return (
    <form onSubmit={submit} className="space-y-6" noValidate>
      {message && <Banner tone={message.tone}>{message.text}</Banner>}

      <Card>
        <CardHeader title="Datos del cliente" />
        <div className="grid gap-4 sm:grid-cols-6">
          <Field label="Tipo" htmlFor="kind" className="sm:col-span-2">
            <Select id="kind" value={v.kind} onChange={(e) => set("kind", e.target.value as typeof v.kind)}>
              <option value="particular">Particular</option>
              <option value="empresa">Empresa / comunidad</option>
            </Select>
          </Field>
          <Field
            label={v.kind === "empresa" ? "Razón social" : "Nombre y apellidos"}
            htmlFor="name"
            required
            error={errors.name}
            className="sm:col-span-4"
          >
            <TextInput id="name" value={v.name} invalid={!!errors.name} onChange={(e) => set("name", e.target.value)} autoFocus={!customer} />
          </Field>
          <Field label="NIF / NIE / CIF" htmlFor="taxId" error={errors.taxId} className="sm:col-span-2">
            <TextInput id="taxId" value={v.taxId} onChange={(e) => set("taxId", e.target.value.toUpperCase())} placeholder="12345678Z" />
            {taxCheck && !errors.taxId &&
              (taxCheck.valid ? (
                <p className="mt-1 text-xs text-emerald-700">Formato {taxCheck.type} válido.</p>
              ) : (
                <p className="mt-1 text-xs text-amber-700">
                  No parece un NIF/NIE/CIF español válido. Puedes guardarlo igualmente.
                </p>
              ))}
          </Field>
          <Field label="Correo electrónico" htmlFor="email" error={errors.email} className="sm:col-span-2">
            <TextInput id="email" type="email" value={v.email} invalid={!!errors.email} onChange={(e) => set("email", e.target.value)} />
          </Field>
          <Field label="Teléfono" htmlFor="phone" className="sm:col-span-2">
            <TextInput id="phone" type="tel" value={v.phone} onChange={(e) => set("phone", e.target.value)} />
          </Field>
        </div>
      </Card>

      <Card>
        <CardHeader title="Dirección fiscal / de contacto" />
        <div className="grid gap-4 sm:grid-cols-6">
          <Field label="Dirección" htmlFor="address" className="sm:col-span-6">
            <TextInput id="address" value={v.address} onChange={(e) => set("address", e.target.value)} placeholder="Calle, número, piso" />
          </Field>
          <Field label="Código postal" htmlFor="postalCode" error={errors.postalCode} className="sm:col-span-2">
            <TextInput id="postalCode" inputMode="numeric" maxLength={5} value={v.postalCode} invalid={!!errors.postalCode} onChange={(e) => set("postalCode", e.target.value)} />
          </Field>
          <Field label="Población" htmlFor="city" className="sm:col-span-2">
            <TextInput id="city" value={v.city} onChange={(e) => set("city", e.target.value)} />
          </Field>
          <Field label="Provincia" htmlFor="province" className="sm:col-span-2">
            <TextInput id="province" list="provincias" value={v.province} onChange={(e) => set("province", e.target.value)} />
            <datalist id="provincias">
              {PROVINCES.map((p) => (
                <option key={p} value={p} />
              ))}
            </datalist>
          </Field>
        </div>
      </Card>

      <Card>
        <CardHeader title="Notas internas" description="Solo las ves tú; no aparecen en los presupuestos." />
        <TextArea id="notes" rows={3} value={v.notes} onChange={(e) => set("notes", e.target.value)} aria-label="Notas internas" />
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          <Button type="submit" disabled={pending}>
            {pending ? "Guardando…" : customer ? "Guardar cambios" : "Crear cliente"}
          </Button>
          <ButtonLink href={nextUrl ?? "/clientes"} variant="secondary">
            Cancelar
          </ButtonLink>
        </div>
        {customer && canDelete && (
          <ConfirmButton
            title="Eliminar cliente"
            message={<>Se eliminará a <strong>{customer.name}</strong>. Esta acción no se puede deshacer.</>}
            onConfirm={async () => {
              const res = await deleteCustomerAction(customer.id);
              if (!res.ok) return res.message;
              router.push("/clientes");
            }}
          >
            Eliminar cliente
          </ConfirmButton>
        )}
      </div>
    </form>
  );
}
