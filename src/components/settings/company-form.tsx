"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { ImagePlus, Trash2 } from "lucide-react";
import { saveCompanyAction } from "@/app/actions/company";
import { useForm } from "@/components/forms/use-form";
import { Button } from "@/components/ui/button";
import { Banner, Card, CardHeader } from "@/components/ui/card";
import { Field, TextArea, TextInput } from "@/components/ui/fields";
import { NumberField, PercentField } from "@/components/ui/number-fields";
import { validateSpanishTaxId } from "@/lib/tax-id";
import type { Company } from "@/lib/types";
import { PROVINCES } from "@/lib/units";
import { readLogoFile } from "./logo-upload";

type Values = Omit<Company, "updatedAt" | "defaultValidityDays" | "defaultMarkupBp"> & {
  defaultValidityDays: number | null;
  defaultMarkupBp: number | null;
};

export function CompanyForm({
  company,
  section,
}: {
  company: Company;
  section: "empresa" | "presupuestos";
}) {
  const router = useRouter();
  const { updatedAt: _updatedAt, ...initial } = company;
  void _updatedAt;
  const form = useForm<Values>(initial);
  const { values: v, set, errors } = form;
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const taxCheck = v.taxId.trim() ? validateSpanishTaxId(v.taxId) : null;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    if (v.defaultValidityDays === null || v.defaultMarkupBp === null) {
      form.setErrors({
        ...(v.defaultValidityDays === null ? { defaultValidityDays: "Introduce un número de días" } : {}),
        ...(v.defaultMarkupBp === null ? { defaultMarkupBp: "Introduce un porcentaje" } : {}),
      });
      setMessage({ tone: "error", text: "Revisa los campos marcados en rojo." });
      return;
    }
    startTransition(async () => {
      const res = await saveCompanyAction(v);
      if (!res.ok) {
        form.setErrors(res.errors ?? {});
        setMessage({ tone: "error", text: res.message });
        return;
      }
      form.setDirty(false);
      setMessage({ tone: "success", text: "Configuración guardada." });
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="space-y-6" noValidate>
      {message && <Banner tone={message.tone}>{message.text}</Banner>}

      {section === "empresa" && (
        <>
          <Card>
            <CardHeader title="Datos fiscales" description="Aparecen en la cabecera de tus presupuestos en PDF." />
            <div className="grid gap-4 sm:grid-cols-6">
              <Field label="Razón social / nombre completo" htmlFor="legalName" error={errors.legalName} className="sm:col-span-4">
                <TextInput id="legalName" value={v.legalName} onChange={(e) => set("legalName", e.target.value)} placeholder="Reformas Ejemplo S.L." />
              </Field>
              <Field label="NIF / CIF" htmlFor="taxId" error={errors.taxId} className="sm:col-span-2">
                <TextInput id="taxId" value={v.taxId} onChange={(e) => set("taxId", e.target.value.toUpperCase())} />
                {taxCheck && !errors.taxId &&
                  (taxCheck.valid ? (
                    <p className="mt-1 text-xs text-emerald-700">Formato {taxCheck.type} válido.</p>
                  ) : (
                    <p className="mt-1 text-xs text-amber-700">No parece un NIF/NIE/CIF español válido. Revísalo.</p>
                  ))}
              </Field>
              <Field label="Nombre comercial" htmlFor="tradeName" className="sm:col-span-6" hint="Opcional. Si lo rellenas, se muestra en lugar de la razón social.">
                <TextInput id="tradeName" value={v.tradeName} onChange={(e) => set("tradeName", e.target.value)} />
              </Field>
              <Field label="Dirección" htmlFor="address" className="sm:col-span-6">
                <TextInput id="address" value={v.address} onChange={(e) => set("address", e.target.value)} />
              </Field>
              <Field label="Código postal" htmlFor="postalCode" error={errors.postalCode} className="sm:col-span-2">
                <TextInput id="postalCode" inputMode="numeric" maxLength={5} value={v.postalCode} invalid={!!errors.postalCode} onChange={(e) => set("postalCode", e.target.value)} />
              </Field>
              <Field label="Población" htmlFor="city" className="sm:col-span-2">
                <TextInput id="city" value={v.city} onChange={(e) => set("city", e.target.value)} />
              </Field>
              <Field label="Provincia" htmlFor="province" className="sm:col-span-2">
                <TextInput id="province" list="provincias-empresa" value={v.province} onChange={(e) => set("province", e.target.value)} />
                <datalist id="provincias-empresa">{PROVINCES.map((p) => <option key={p} value={p} />)}</datalist>
              </Field>
            </div>
          </Card>

          <Card>
            <CardHeader title="Contacto y pago" />
            <div className="grid gap-4 sm:grid-cols-6">
              <Field label="Teléfono" htmlFor="phone" className="sm:col-span-2">
                <TextInput id="phone" type="tel" value={v.phone} onChange={(e) => set("phone", e.target.value)} />
              </Field>
              <Field label="Correo electrónico" htmlFor="email" error={errors.email} className="sm:col-span-2">
                <TextInput id="email" type="email" value={v.email} invalid={!!errors.email} onChange={(e) => set("email", e.target.value)} />
              </Field>
              <Field label="Web" htmlFor="website" className="sm:col-span-2">
                <TextInput id="website" value={v.website} onChange={(e) => set("website", e.target.value)} />
              </Field>
              <Field label="IBAN para transferencias" htmlFor="iban" error={errors.iban} className="sm:col-span-6" hint="Opcional. Se muestra en el PDF para facilitar el pago.">
                <TextInput id="iban" value={v.iban} invalid={!!errors.iban} onChange={(e) => set("iban", e.target.value.toUpperCase())} placeholder="ES00 0000 0000 0000 0000 0000" />
              </Field>
            </div>
          </Card>

          <Card>
            <CardHeader title="Imagen de marca" description="El logo y el color de acento se usan en el PDF del presupuesto." />
            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <p className="mb-1 text-sm font-medium text-slate-700">Logo</p>
                <div className="flex items-center gap-4">
                  <div className="flex h-20 w-32 items-center justify-center overflow-hidden rounded-lg border border-dashed border-slate-300 bg-slate-50">
                    {v.logoDataUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={v.logoDataUrl} alt="Logo de la empresa" className="max-h-full max-w-full object-contain" />
                    ) : (
                      <ImagePlus className="h-6 w-6 text-slate-300" aria-hidden />
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/png,image/jpeg"
                      className="sr-only"
                      aria-label="Subir logo"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        e.target.value = "";
                        if (!file) return;
                        try {
                          set("logoDataUrl", await readLogoFile(file));
                          setMessage(null);
                        } catch (err) {
                          setMessage({ tone: "error", text: err instanceof Error ? err.message : "No se pudo cargar el logo." });
                        }
                      }}
                    />
                    <Button variant="secondary" size="sm" onClick={() => fileRef.current?.click()}>
                      {v.logoDataUrl ? "Cambiar logo" : "Subir logo"}
                    </Button>
                    {v.logoDataUrl && (
                      <Button variant="ghost" size="sm" onClick={() => set("logoDataUrl", "")}>
                        <Trash2 className="h-4 w-4" aria-hidden /> Quitar
                      </Button>
                    )}
                  </div>
                </div>
                <p className="mt-2 text-xs text-slate-500">PNG o JPG. Se reduce automáticamente.</p>
              </div>
              <Field label="Color de acento" htmlFor="accentColor" error={errors.accentColor}>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    aria-label="Selector de color"
                    value={v.accentColor}
                    onChange={(e) => set("accentColor", e.target.value)}
                    className="h-10 w-14 cursor-pointer rounded-lg border border-slate-300 bg-white p-1"
                  />
                  <TextInput id="accentColor" value={v.accentColor} invalid={!!errors.accentColor} onChange={(e) => set("accentColor", e.target.value)} className="max-w-32 font-mono" />
                </div>
              </Field>
            </div>
          </Card>
        </>
      )}

      {section === "presupuestos" && (
        <>
          <Card>
            <CardHeader title="Numeración y validez" description="Los números son correlativos por año, por ejemplo P-2026-0001." />
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Prefijo del número" htmlFor="quotePrefix" error={errors.quotePrefix} hint="Solo afecta a los presupuestos nuevos.">
                <TextInput id="quotePrefix" value={v.quotePrefix} invalid={!!errors.quotePrefix} onChange={(e) => set("quotePrefix", e.target.value)} />
              </Field>
              <Field label="Validez por defecto" htmlFor="defaultValidityDays" error={errors.defaultValidityDays}>
                <NumberField id="defaultValidityDays" decimals={0} suffix="días" value={v.defaultValidityDays} invalid={!!errors.defaultValidityDays} onChange={(n) => set("defaultValidityDays", n)} />
              </Field>
              <Field label="Margen sobre coste por defecto" htmlFor="defaultMarkupBp" error={errors.defaultMarkupBp} hint="Se propone al crear artículos nuevos.">
                <PercentField id="defaultMarkupBp" bp={v.defaultMarkupBp} invalid={!!errors.defaultMarkupBp} onChange={(bp) => set("defaultMarkupBp", bp)} />
              </Field>
            </div>
          </Card>
          <Card>
            <CardHeader title="Textos por defecto" description="Se rellenan en cada presupuesto nuevo y puedes cambiarlos en cada uno." />
            <div className="grid gap-4">
              <Field label="Forma de pago" htmlFor="defaultPaymentTerms" error={errors.defaultPaymentTerms}>
                <TextArea id="defaultPaymentTerms" rows={3} value={v.defaultPaymentTerms} onChange={(e) => set("defaultPaymentTerms", e.target.value)} placeholder="Ej.: 40 % a la aceptación, 40 % a mitad de obra y 20 % a la finalización." />
              </Field>
              <Field label="Condiciones del presupuesto" htmlFor="defaultConditions" error={errors.defaultConditions}>
                <TextArea id="defaultConditions" rows={6} value={v.defaultConditions} onChange={(e) => set("defaultConditions", e.target.value)} placeholder="Ej.: Plazo de ejecución, qué no incluye el presupuesto, gestión de licencias y residuos…" />
              </Field>
            </div>
          </Card>
        </>
      )}

      <div>
        <Button type="submit" disabled={pending}>{pending ? "Guardando…" : "Guardar cambios"}</Button>
      </div>
    </form>
  );
}
