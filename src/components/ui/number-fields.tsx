"use client";

import { useState, type ComponentProps } from "react";
import { cn } from "@/lib/cn";
import { eurosToCents, parseDecimalEs, percentToBp, toInputString } from "@/lib/money";
import { inputClass, inputErrorClass } from "./fields";

type InputProps = Omit<ComponentProps<"input">, "value" | "onChange" | "type" | "inputMode">;

interface NumberFieldProps extends InputProps {
  value: number | null;
  onChange: (value: number | null) => void;
  /** Máximo de decimales. */
  decimals?: number;
  /** Rellena siempre los decimales (p. ej. dinero: 12,00). */
  fixed?: boolean;
  suffix?: string;
  invalid?: boolean;
}

function format(value: number | null, decimals: number, fixed: boolean): string {
  if (value === null || !Number.isFinite(value)) return "";
  if (fixed) return value.toFixed(decimals).replace(".", ",");
  return toInputString(value, decimals);
}

/**
 * Campo numérico que entiende el formato español ("1.250,50", "12,5").
 * Mientras se escribe respeta lo tecleado; al salir muestra el valor formateado.
 */
export function NumberField({
  value,
  onChange,
  decimals = 2,
  fixed = false,
  suffix,
  invalid,
  className,
  onBlur,
  onFocus,
  ...props
}: NumberFieldProps) {
  const [draft, setDraft] = useState<string | null>(null);

  const draftInvalid =
    draft !== null && draft.trim() !== "" && parseDecimalEs(draft) === null;
  const shown = draft ?? format(value, decimals, fixed);

  return (
    <div className="relative">
      <input
        {...props}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        value={shown}
        aria-invalid={invalid || draftInvalid || undefined}
        className={cn(
          inputClass,
          "text-right tabular-nums",
          suffix && "pr-8",
          (invalid || draftInvalid) && inputErrorClass,
          className,
        )}
        onFocus={(e) => {
          e.currentTarget.select();
          onFocus?.(e);
        }}
        onChange={(e) => {
          const raw = e.target.value;
          setDraft(raw);
          if (raw.trim() === "") return onChange(null);
          const parsed = parseDecimalEs(raw);
          onChange(parsed === null ? null : Number(parsed.toFixed(decimals)));
        }}
        onBlur={(e) => {
          if (draft !== null && (draft.trim() === "" || parseDecimalEs(draft) !== null)) {
            setDraft(null);
          }
          onBlur?.(e);
        }}
      />
      {suffix && (
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-slate-400">
          {suffix}
        </span>
      )}
    </div>
  );
}

type Wrapped = Omit<NumberFieldProps, "value" | "onChange" | "decimals" | "fixed" | "suffix">;

/** Importe en céntimos <-> euros con formato español. */
export function MoneyField({
  cents,
  onChange,
  ...props
}: Wrapped & { cents: number | null; onChange: (cents: number | null) => void }) {
  return (
    <NumberField
      {...props}
      value={cents === null ? null : cents / 100}
      onChange={(v) => onChange(v === null ? null : eurosToCents(v))}
      decimals={2}
      fixed
      suffix="€"
    />
  );
}

/** Porcentaje en puntos básicos <-> % con formato español. */
export function PercentField({
  bp,
  onChange,
  ...props
}: Wrapped & { bp: number | null; onChange: (bp: number | null) => void }) {
  return (
    <NumberField
      {...props}
      value={bp === null ? null : bp / 100}
      onChange={(v) => onChange(v === null ? null : percentToBp(v))}
      decimals={2}
      suffix="%"
    />
  );
}

/** Cantidad con hasta 3 decimales. */
export function QuantityField(props: Wrapped & { value: number | null; onChange: (v: number | null) => void }) {
  return <NumberField {...props} decimals={3} />;
}
