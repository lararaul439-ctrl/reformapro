"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Copy, Download, FileText, Pencil } from "lucide-react";
import {
  deleteQuoteAction,
  duplicateQuoteAction,
  setQuoteStatusAction,
} from "@/app/actions/quotes";
import { Button, ButtonLink, buttonClass } from "@/components/ui/button";
import { Banner } from "@/components/ui/card";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { Select } from "@/components/ui/fields";
import { QUOTE_STATUSES, STATUS_LABELS, type QuoteStatus } from "@/lib/quote-status";

export function QuoteActions({
  id,
  number,
  status,
}: {
  id: string;
  number: string;
  status: QuoteStatus;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      {error && <Banner tone="error">{error}</Banner>}
      <div className="flex flex-wrap items-center gap-2">
        <a
          href={`/api/presupuestos/${id}/pdf`}
          target="_blank"
          rel="noreferrer"
          className={buttonClass("primary")}
        >
          <FileText className="h-4 w-4" aria-hidden /> Ver PDF
        </a>
        <a href={`/api/presupuestos/${id}/pdf?descargar=1`} className={buttonClass("secondary")}>
          <Download className="h-4 w-4" aria-hidden /> Descargar
        </a>
        <ButtonLink href={`/presupuestos/${id}/editar`} variant="secondary">
          <Pencil className="h-4 w-4" aria-hidden /> Editar
        </ButtonLink>
        <Button
          variant="secondary"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              setError(null);
              const res = await duplicateQuoteAction(id);
              if (!res.ok) return setError(res.message);
              router.push(`/presupuestos/${res.id}`);
            })
          }
        >
          <Copy className="h-4 w-4" aria-hidden /> Duplicar
        </Button>
        <div className="flex items-center gap-2">
          <label htmlFor="status" className="text-sm text-slate-500">Estado</label>
          <Select
            id="status"
            value={status}
            disabled={pending}
            className="w-36"
            onChange={(e) =>
              startTransition(async () => {
                setError(null);
                const res = await setQuoteStatusAction(id, e.target.value);
                if (!res.ok) return setError(res.message);
                router.refresh();
              })
            }
          >
            {QUOTE_STATUSES.map((s) => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </Select>
        </div>
        <div className="ml-auto">
          <ConfirmButton
            title="Eliminar presupuesto"
            message={<>Se eliminará el presupuesto <strong>{number}</strong> con todas sus partidas. Esta acción no se puede deshacer.</>}
            onConfirm={async () => {
              const res = await deleteQuoteAction(id);
              if (!res.ok) return res.message;
              router.push("/presupuestos");
            }}
          >
            Eliminar
          </ConfirmButton>
        </div>
      </div>
    </div>
  );
}
