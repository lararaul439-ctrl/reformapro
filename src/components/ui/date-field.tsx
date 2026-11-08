"use client";

import { useRef, useState, type ComponentProps } from "react";
import { CalendarDays } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatDateEs, parseDateEs } from "@/lib/dates";
import { inputClass, inputErrorClass } from "./fields";

interface DateFieldProps
  extends Omit<ComponentProps<"input">, "value" | "onChange" | "type" | "inputMode"> {
  /** Fecha ISO "AAAA-MM-DD" o null. */
  value: string | null;
  onChange: (iso: string | null) => void;
  invalid?: boolean;
}

/** Campo de fecha en formato DD/MM/AAAA, con selector de calendario opcional. */
export function DateField({ value, onChange, invalid, className, onBlur, ...props }: DateFieldProps) {
  const [draft, setDraft] = useState<string | null>(null);
  const pickerRef = useRef<HTMLInputElement>(null);

  const draftInvalid = draft !== null && draft.trim() !== "" && parseDateEs(draft) === null;
  const shown = draft ?? formatDateEs(value);
  const bad = invalid || draftInvalid;

  return (
    <div className="relative">
      <input
        {...props}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder="DD/MM/AAAA"
        value={shown}
        aria-invalid={bad || undefined}
        className={cn(inputClass, "pr-10 tabular-nums", bad && inputErrorClass, className)}
        onChange={(e) => {
          const raw = e.target.value;
          setDraft(raw);
          onChange(raw.trim() === "" ? null : parseDateEs(raw));
        }}
        onBlur={(e) => {
          if (draft !== null && (draft.trim() === "" || parseDateEs(draft) !== null)) setDraft(null);
          onBlur?.(e);
        }}
      />
      <button
        type="button"
        tabIndex={-1}
        aria-label="Abrir calendario"
        className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-slate-400 hover:text-slate-600"
        onClick={() => pickerRef.current?.showPicker?.()}
      >
        <CalendarDays className="h-4 w-4" aria-hidden />
      </button>
      <input
        ref={pickerRef}
        type="date"
        tabIndex={-1}
        aria-hidden
        className="pointer-events-none absolute right-0 bottom-0 h-0 w-0 opacity-0"
        value={value ?? ""}
        onChange={(e) => {
          setDraft(null);
          onChange(e.target.value || null);
        }}
      />
    </div>
  );
}
