"use client";

import { useRef, useState, useTransition, type ReactNode } from "react";
import { Button, type ButtonSize, type ButtonVariant } from "./button";

/** Botón que pide confirmación en un diálogo antes de ejecutar una acción destructiva. */
export function ConfirmButton({
  children,
  title,
  message,
  confirmLabel = "Eliminar",
  variant = "dangerOutline",
  size = "md",
  disabled,
  onConfirm,
}: {
  children: ReactNode;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  /** Puede devolver un mensaje de error para mostrarlo en el diálogo. */
  onConfirm: () => Promise<string | void> | string | void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <>
      <Button
        variant={variant}
        size={size}
        disabled={disabled}
        onClick={() => {
          setError(null);
          ref.current?.showModal();
        }}
      >
        {children}
      </Button>
      <dialog
        ref={ref}
        className="m-auto w-[calc(100%-2rem)] max-w-md rounded-xl bg-white p-0 shadow-xl"
        onClose={() => setError(null)}
      >
        <div className="p-6">
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <div className="mt-2 text-sm text-slate-600">{message}</div>
          {error && (
            <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-800">
              {error}
            </p>
          )}
        </div>
        <div className="flex justify-end gap-2 rounded-b-xl bg-slate-50 px-6 py-4">
          <Button variant="secondary" onClick={() => ref.current?.close()} disabled={pending}>
            Cancelar
          </Button>
          <Button
            variant="danger"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const result = await onConfirm();
                if (typeof result === "string") setError(result);
                else ref.current?.close();
              })
            }
          >
            {pending ? "Procesando…" : confirmLabel}
          </Button>
        </div>
      </dialog>
    </>
  );
}
